package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
)

const (
	PermissionsProxyPath = ApiPathPrefix + "/permissions/:type/*fullName"
	PropagateSchemaPath  = ApiPathPrefix + "/permissions/propagate-schema"
)

var validResourceTypes = map[string]bool{
	"catalog": true,
	"schema":  true,
	"volume":  true,
	"table":   true,
}

type privilegeAssignment struct {
	Principal  string   `json:"principal"`
	Privileges []string `json:"privileges"`
}

type permissionsResponse struct {
	PrivilegeAssignments []privilegeAssignment `json:"privilege_assignments"`
}

type permChange struct {
	Principal string   `json:"principal"`
	Type      string   `json:"type"`
	Add       []string `json:"add,omitempty"`
	Remove    []string `json:"remove,omitempty"`
}

type patchRequest struct {
	Changes []permChange `json:"changes"`
}

func (app *App) GetPermissionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	resType := ps.ByName("type")
	fullName := strings.TrimPrefix(ps.ByName("fullName"), "/")

	if !validResourceTypes[resType] || fullName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("invalid resource type or name"))
		return
	}

	resp := permissionsResponse{PrivilegeAssignments: []privilegeAssignment{}}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (app *App) PatchPermissionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok"}`)
}

func (app *App) PropagateSchemaHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","users":0,"grants":0,"volumes":0,"tables":0}`)
}
