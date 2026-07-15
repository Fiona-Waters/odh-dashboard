package api

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

const ConnectionsPath = ApiPathPrefix + "/connections"

type connectionResponse struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Namespace   string `json:"namespace"`
	Type        string `json:"type"`
	Endpoint    string `json:"endpoint,omitempty"`
	Bucket      string `json:"bucket,omitempty"`
}

func decodeSecretField(data map[string][]byte, key string) string {
	raw, ok := data[key]
	if !ok || len(raw) == 0 {
		return ""
	}
	if decoded, err := base64.StdEncoding.DecodeString(string(raw)); err == nil {
		return string(decoded)
	}
	return string(raw)
}

func (app *App) ConnectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	secrets, err := client.ListConnectionSecrets(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list connection secrets: %w", err))
		return
	}

	connections := make([]connectionResponse, 0, len(secrets))
	for _, s := range secrets {
		connType := "unknown"
		if v, ok := s.Annotations["opendatahub.io/connection-type-protocol"]; ok {
			connType = v
		} else if v, ok := s.Annotations["opendatahub.io/connection-type-ref"]; ok {
			connType = v
		}

		displayName := s.Name
		if v, ok := s.Annotations["openshift.io/display-name"]; ok && v != "" {
			displayName = v
		}

		conn := connectionResponse{
			Name:        s.Name,
			DisplayName: displayName,
			Namespace:   s.Namespace,
			Type:        connType,
			Endpoint:    decodeSecretField(s.Data, "AWS_S3_ENDPOINT"),
			Bucket:      decodeSecretField(s.Data, "AWS_S3_BUCKET"),
		}
		connections = append(connections, conn)
	}

	result, _ := json.Marshal(map[string]interface{}{"connections": connections})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}
