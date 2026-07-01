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
	SchemasPath    = ApiPathPrefix + "/catalogs/:name/schemas"
	TablesPath     = ApiPathPrefix + "/catalogs/:name/schemas/:schema/tables"
	VolumesPath    = ApiPathPrefix + "/catalogs/:name/schemas/:schema/volumes"
	ProvenancePath = ApiPathPrefix + "/catalogs/:name/schemas/:schema/volumes/:volume/milvus-stats"
)

func (app *App) ListSchemasHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	url := feastURL("/namespaces/%s/namespaces", catalogName)

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

	type schema struct {
		Name        string `json:"name"`
		CatalogName string `json:"catalog_name"`
	}
	schemas := make([]schema, 0)
	for _, ns := range feastResp.Namespaces {
		schemaName := "default"
		if len(ns) > 1 {
			schemaName = ns[1]
		}
		schemas = append(schemas, schema{Name: schemaName, CatalogName: catalogName})
	}

	result, _ := json.Marshal(map[string]interface{}{"schemas": schemas})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) ListTablesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	url := feastURL("/namespaces/%s/namespaces/%s/tables", catalogName, schemaName)

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
		Identifiers []struct {
			Namespace []string `json:"namespace"`
			Name      string   `json:"name"`
		} `json:"identifiers"`
	}
	json.Unmarshal(body, &feastResp)

	type table struct {
		Name        string `json:"name"`
		CatalogName string `json:"catalog_name"`
		SchemaName  string `json:"schema_name"`
		TableType   string `json:"table_type"`
		Format      string `json:"data_source_format"`
	}
	tables := make([]table, 0)
	for _, t := range feastResp.Identifiers {
		tables = append(tables, table{
			Name:        t.Name,
			CatalogName: catalogName,
			SchemaName:  schemaName,
			TableType:   "MANAGED",
			Format:      "ICEBERG",
		})
	}

	result, _ := json.Marshal(map[string]interface{}{"tables": tables})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) ListVolumesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	url := feastURL("/namespaces/%s/namespaces/%s/volumes", catalogName, schemaName)

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
		Volumes []struct {
			Name            string `json:"name"`
			VolumeType      string `json:"volume-type"`
			StorageLocation string `json:"storage-location"`
			Comment         string `json:"comment"`
		} `json:"volumes"`
	}
	json.Unmarshal(body, &feastResp)

	type volume struct {
		Name            string `json:"name"`
		CatalogName     string `json:"catalog_name"`
		SchemaName      string `json:"schema_name"`
		VolumeType      string `json:"volume_type"`
		StorageLocation string `json:"storage_location"`
		Comment         string `json:"comment"`
	}
	volumes := make([]volume, 0)
	for _, v := range feastResp.Volumes {
		volumes = append(volumes, volume{
			Name:            v.Name,
			CatalogName:     catalogName,
			SchemaName:      schemaName,
			VolumeType:      v.VolumeType,
			StorageLocation: v.StorageLocation,
			Comment:         v.Comment,
		})
	}

	result, _ := json.Marshal(map[string]interface{}{"volumes": volumes})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) CreateSchemaHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusMethodNotAllowed)
	fmt.Fprintf(w, `{"error":"schemas are implicit in Feast (always 'default')"}`)
}

func (app *App) CreateTableHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")

	bodyBytes, _ := io.ReadAll(r.Body)
	var ucReq struct {
		Name            string `json:"name"`
		StorageLocation string `json:"storage_location"`
		Format          string `json:"data_source_format"`
		Columns         []struct {
			Name     string `json:"name"`
			TypeName string `json:"type_name"`
		} `json:"columns"`
	}
	json.Unmarshal(bodyBytes, &ucReq)

	icebergTypeMap := map[string]string{
		"INT": "int", "INTEGER": "int", "LONG": "long", "STRING": "string",
		"DOUBLE": "double", "FLOAT": "float", "BOOLEAN": "boolean",
		"DATE": "string", "TIMESTAMP": "timestamptz",
	}

	fields := make([]map[string]interface{}, 0, len(ucReq.Columns))
	for i, col := range ucReq.Columns {
		icebergType := icebergTypeMap[col.TypeName]
		if icebergType == "" {
			icebergType = "string"
		}
		fields = append(fields, map[string]interface{}{
			"id": i + 1, "name": col.Name, "required": false, "type": icebergType,
		})
	}

	feastBody := map[string]interface{}{
		"name":   ucReq.Name,
		"schema": map[string]interface{}{"type": "struct", "schema-id": 0, "fields": fields},
	}
	if ucReq.StorageLocation != "" {
		feastBody["location"] = ucReq.StorageLocation
	}
	if ucReq.Format != "" {
		feastBody["properties"] = map[string]string{"format": ucReq.Format}
	}
	feastJSON, _ := json.Marshal(feastBody)

	url := feastURL("/namespaces/%s/namespaces/%s/tables", catalogName, schemaName)
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
	proxyResponse(w, resp)
}

func (app *App) CreateVolumeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")

	bodyBytes, _ := io.ReadAll(r.Body)
	var ucReq struct {
		Name            string `json:"name"`
		VolumeType      string `json:"volume_type"`
		StorageLocation string `json:"storage_location"`
		Comment         string `json:"comment"`
	}
	json.Unmarshal(bodyBytes, &ucReq)

	if ucReq.VolumeType == "" {
		ucReq.VolumeType = "EXTERNAL"
	}

	feastBody := map[string]interface{}{
		"name":             ucReq.Name,
		"volume-type":      ucReq.VolumeType,
		"storage-location": ucReq.StorageLocation,
		"comment":          ucReq.Comment,
	}
	feastJSON, _ := json.Marshal(feastBody)

	url := feastURL("/namespaces/%s/namespaces/%s/volumes", catalogName, schemaName)
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
	proxyResponse(w, resp)
}

func (app *App) DeleteSchemaHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusMethodNotAllowed)
	fmt.Fprintf(w, `{"error":"schemas are implicit in Feast (always 'default')"}`)
}

func (app *App) DeleteTableHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	tableName := ps.ByName("table")

	url := feastURL("/namespaces/%s/namespaces/%s/tables/%s", catalogName, schemaName, tableName)
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

func (app *App) DeleteVolumeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	volumeName := ps.ByName("volume")

	url := feastURL("/namespaces/%s/namespaces/%s/volumes/%s", catalogName, schemaName, volumeName)
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

func (app *App) UpdateTableHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	tableName := ps.ByName("table")

	bodyBytes, _ := io.ReadAll(r.Body)

	url := feastURL("/namespaces/%s/namespaces/%s/tables/%s", catalogName, schemaName, tableName)
	req, err := feastRequest(r, http.MethodPut, url, strings.NewReader(string(bodyBytes)))
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

func (app *App) UpdateVolumeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	volumeName := ps.ByName("volume")

	bodyBytes, _ := io.ReadAll(r.Body)

	url := feastURL("/namespaces/%s/namespaces/%s/volumes/%s", catalogName, schemaName, volumeName)
	req, err := feastRequest(r, http.MethodPut, url, strings.NewReader(string(bodyBytes)))
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

func (app *App) UpdateNamespaceHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")

	bodyBytes, _ := io.ReadAll(r.Body)

	url := feastURL("/namespaces/%s/properties", catalogName)
	req, err := feastRequest(r, http.MethodPost, url, strings.NewReader(string(bodyBytes)))
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
