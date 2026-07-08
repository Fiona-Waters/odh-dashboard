package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
)

const (
	CatalogsPath    = ApiPathPrefix + "/catalogs"
	CatalogPath     = ApiPathPrefix + "/catalogs/:name"
	PermissionsPath = ApiPathPrefix + "/catalogs/:name/permissions"
)

func (app *App) CatalogsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	url := feastURL("/namespaces")

	req, err := feastRequest(r, http.MethodGet, url, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	client := newFeastClient()
	resp, err := client.Do(req)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var feastResp struct {
		Namespaces [][]string `json:"namespaces"`
	}
	json.Unmarshal(body, &feastResp)

	type catalog struct {
		Name      string `json:"name"`
		ID        string `json:"id"`
		CreatedAt int64  `json:"created_at"`
		UpdatedAt int64  `json:"updated_at"`
		Comment   string `json:"comment,omitempty"`
	}
	catalogs := make([]catalog, 0, len(feastResp.Namespaces))
	for _, ns := range feastResp.Namespaces {
		if len(ns) > 0 {
			c := catalog{Name: ns[0], ID: ns[0]}
			detailURL := feastURL("/namespaces/%s", ns[0])
			detailReq, _ := feastRequest(r, http.MethodGet, detailURL, nil)
			detailResp, dErr := client.Do(detailReq)
			if dErr == nil {
				dBody, _ := io.ReadAll(detailResp.Body)
				detailResp.Body.Close()
				var nsDetail struct {
					Properties map[string]string `json:"properties"`
				}
				json.Unmarshal(dBody, &nsDetail)
				if v, ok := nsDetail.Properties["created_at"]; ok {
					fmt.Sscanf(v, "%d", &c.CreatedAt)
				}
				if v, ok := nsDetail.Properties["updated_at"]; ok {
					fmt.Sscanf(v, "%d", &c.UpdatedAt)
				}
				c.Comment = nsDetail.Properties["description"]
			}
			catalogs = append(catalogs, c)
		}
	}

	result, _ := json.Marshal(map[string]interface{}{"catalogs": catalogs})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) CreateCatalogHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !isAdmin(r) {
		app.forbiddenResponse(w, r, "admin access required")
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	var ucReq struct {
		Name       string            `json:"name"`
		Comment    string            `json:"comment"`
		Properties map[string]string `json:"properties"`
	}
	json.Unmarshal(bodyBytes, &ucReq)

	props := make(map[string]string)
	for k, v := range ucReq.Properties {
		props[k] = v
	}
	if ucReq.Comment != "" {
		props["description"] = ucReq.Comment
	}
	feastBody := map[string]interface{}{
		"namespace":  []string{ucReq.Name},
		"properties": props,
	}

	feastJSON, _ := json.Marshal(feastBody)
	url := feastURL("/namespaces")

	req, err := feastRequest(r, http.MethodPost, url, strings.NewReader(string(feastJSON)))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	resp, err := newFeastClient().Do(req)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var feastResp struct {
		Namespace  []string          `json:"namespace"`
		Properties map[string]string `json:"properties"`
	}
	json.Unmarshal(body, &feastResp)

	name := ""
	if len(feastResp.Namespace) > 0 {
		name = feastResp.Namespace[0]
	}

	result, _ := json.Marshal(map[string]interface{}{
		"name":    name,
		"id":      name,
		"comment": feastResp.Properties["comment"],
	})
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(result)
}

func (app *App) DeleteCatalogHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !isAdmin(r) {
		app.forbiddenResponse(w, r, "admin access required")
		return
	}

	name := ps.ByName("name")
	url := feastURL("/namespaces/%s", name)

	req, err := feastRequest(r, http.MethodDelete, url, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	resp, err := newFeastClient().Do(req)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer resp.Body.Close()
	proxyResponse(w, resp)
}

func (app *App) GetCatalogPermissionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"privilege_assignments":[]}`)
}

func (app *App) UpdateCatalogPermissionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"privilege_assignments":[]}`)
}

func (app *App) SCIMUsersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"Resources":[],"totalResults":0}`)
}

func (app *App) CreateSCIMUserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ok"}`)
}

func (app *App) AdminCheckHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	admin := isAdmin(r)
	w.Header().Set("Content-Type", "application/json")
	if admin {
		fmt.Fprintf(w, `{"isAdmin":true,"canDelete":true}`)
	} else {
		fmt.Fprintf(w, `{"isAdmin":false,"canDelete":false}`)
	}
}

func (app *App) MetastorePermissionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{}`)
}
