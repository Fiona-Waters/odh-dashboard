package api

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func getK8sAPIURL() string {
	if url := os.Getenv("K8S_API_URL"); url != "" {
		return url
	}
	return "https://kubernetes.default.svc"
}

func getFeastCatalogURL() string {
	if url := os.Getenv("FEAST_CATALOG_URL"); url != "" {
		return strings.TrimRight(url, "/")
	}
	return "http://localhost:6566"
}

func newFeastClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // #nosec G402
		},
	}
}

func feastRequest(r *http.Request, method, url string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(r.Context(), method, url, body)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

func feastURL(pathFmt string, args ...interface{}) string {
	return fmt.Sprintf("%s/v1"+pathFmt, append([]interface{}{getFeastCatalogURL()}, args...)...)
}

func proxyResponse(w http.ResponseWriter, resp *http.Response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getUserIdentity(r *http.Request) string {
	if user := r.Header.Get("X-Auth-Request-User"); user != "" {
		return user
	}
	if user := r.Header.Get("x-forwarded-user"); user != "" {
		return user
	}
	if user := r.Header.Get("kubeflow-userid"); user != "" {
		return user
	}
	return ""
}

func isAdmin(r *http.Request) bool {
	user := getUserIdentity(r)
	if user == "" {
		return false
	}

	groups := r.Header.Get("X-Auth-Request-Groups")
	if groups == "" {
		groups = r.Header.Get("X-Forwarded-Groups")
	}

	adminGroup := os.Getenv("ADMIN_GROUP")
	if adminGroup == "" {
		adminGroup = "rhods-admins"
	}

	if groups != "" {
		for _, g := range strings.Split(groups, ",") {
			if strings.TrimSpace(g) == adminGroup {
				return true
			}
		}
	}

	adminUsers := os.Getenv("ADMIN_USERS")
	if adminUsers != "" {
		for _, admin := range strings.Split(adminUsers, ",") {
			if strings.TrimSpace(admin) == user {
				return true
			}
		}
	}

	return false
}

func stringReader(s string) io.Reader {
	return strings.NewReader(s)
}
