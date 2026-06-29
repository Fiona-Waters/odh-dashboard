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

	resp, err := newFeastClient().Do(req)
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
		Name string `json:"name"`
		ID   string `json:"id"`
	}
	catalogs := make([]catalog, 0, len(feastResp.Namespaces))
	for _, ns := range feastResp.Namespaces {
		if len(ns) > 0 {
			catalogs = append(catalogs, catalog{Name: ns[0], ID: ns[0]})
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
		Name    string `json:"name"`
		Comment string `json:"comment"`
	}
	json.Unmarshal(bodyBytes, &ucReq)

	feastBody := map[string]interface{}{
		"namespace":  []string{ucReq.Name},
		"properties": map[string]string{},
	}
	if ucReq.Comment != "" {
		feastBody["properties"] = map[string]string{"comment": ucReq.Comment}
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
