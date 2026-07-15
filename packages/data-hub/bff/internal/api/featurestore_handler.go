package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
)

const (
	FeatureStorePath = ApiPathPrefix + "/featurestore/:namespace"
)

type featureStoreStatus struct {
	Status    string `json:"status"`
	Namespace string `json:"namespace"`
	Name      string `json:"name,omitempty"`
	Message   string `json:"message,omitempty"`
}

// GetFeatureStoreHandler checks if a FeatureStore CR exists in the given namespace.
func (app *App) GetFeatureStoreHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace is required"))
		return
	}

	exists, name, err := app.checkFeatureStoreCR(r.Context(), namespace)
	if err != nil {
		app.logger.Error("failed to check FeatureStore CR", "namespace", namespace, "error", err)
		respondJSON(w, http.StatusOK, featureStoreStatus{
			Status:    "unknown",
			Namespace: namespace,
			Message:   fmt.Sprintf("Unable to check: %v", err),
		})
		return
	}

	if exists {
		respondJSON(w, http.StatusOK, featureStoreStatus{Status: "ready", Namespace: namespace, Name: name})
	} else {
		respondJSON(w, http.StatusOK, featureStoreStatus{Status: "not_found", Namespace: namespace})
	}
}

// EnsureFeatureStoreHandler checks for a FeatureStore CR and creates one if missing.
func (app *App) EnsureFeatureStoreHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace is required"))
		return
	}

	exists, name, err := app.checkFeatureStoreCR(r.Context(), namespace)
	if err != nil {
		respondJSON(w, http.StatusOK, featureStoreStatus{
			Status: "error", Namespace: namespace,
			Message: fmt.Sprintf("Unable to check: %v", err),
		})
		return
	}

	if exists {
		respondJSON(w, http.StatusOK, featureStoreStatus{Status: "ready", Namespace: namespace, Name: name})
		return
	}

	crName := fmt.Sprintf("feast-%s", namespace)
	if err := app.createFeatureStoreCR(r.Context(), namespace, crName); err != nil {
		app.logger.Error("failed to create FeatureStore CR", "namespace", namespace, "error", err)
		respondJSON(w, http.StatusOK, featureStoreStatus{
			Status: "error", Namespace: namespace,
			Message: fmt.Sprintf("Failed to create: %v", err),
		})
		return
	}

	app.logger.Info("created FeatureStore CR", "namespace", namespace, "name", crName)
	respondJSON(w, http.StatusOK, featureStoreStatus{
		Status:    "created",
		Namespace: namespace,
		Name:      crName,
		Message:   "FeatureStore CR created. The Feast operator will provision the server.",
	})
}

func (app *App) checkFeatureStoreCR(ctx context.Context, namespace string) (bool, string, error) {
	url := fmt.Sprintf("%s/apis/feast.dev/v1alpha1/namespaces/%s/featurestores", getK8sAPIURL(), namespace)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, "", err
	}
	req.Header.Set("Authorization", "Bearer "+readSAToken())

	resp, err := k8sClient().Do(req)
	if err != nil {
		return false, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusForbidden {
		return false, "", nil
	}

	var result struct {
		Items []struct {
			Metadata struct {
				Name string `json:"name"`
			} `json:"metadata"`
		} `json:"items"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if len(result.Items) > 0 {
		return true, result.Items[0].Metadata.Name, nil
	}
	return false, "", nil
}

func (app *App) createFeatureStoreCR(ctx context.Context, namespace, name string) error {
	url := fmt.Sprintf("%s/apis/feast.dev/v1alpha1/namespaces/%s/featurestores", getK8sAPIURL(), namespace)

	cr := fmt.Sprintf(`{
		"apiVersion": "feast.dev/v1alpha1",
		"kind": "FeatureStore",
		"metadata": {"name": %q, "namespace": %q},
		"spec": {"feastProject": %q}
	}`, name, namespace, namespace)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(cr))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+readSAToken())
	req.Header.Set("Content-Type", "application/json")

	resp, err := k8sClient().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("K8s API returned %d", resp.StatusCode)
	}
	return nil
}

func readSAToken() string {
	data, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func k8sClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // #nosec G402
		},
	}
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
