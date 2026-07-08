package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/julienschmidt/httprouter"
)

const (
	TableVersionsPath = ApiPathPrefix + "/catalogs/:name/schemas/:schema/tables/:table/versions"
)

type FileChanged struct {
	Filename  string `json:"filename"`
	Action    string `json:"action"`
	LOB       string `json:"lob,omitempty"`
	SizeBytes int64  `json:"size_bytes,omitempty"`
	OldSize   int64  `json:"old_size,omitempty"`
	NewSize   int64  `json:"new_size,omitempty"`
}

type DeltaStats struct {
	DeltaVersion   int           `json:"deltaVersion"`
	TotalRows      int           `json:"totalRows"`
	RowsAdded      int           `json:"rowsAdded"`
	RowsSuperseded int           `json:"rowsSuperseded"`
	Operation      string        `json:"operation"`
	FilesChanged   []FileChanged `json:"filesChanged,omitempty"`
}

type TableVersion struct {
	Version        string      `json:"version"`
	CreatedAt      string      `json:"createdAt"`
	DeltaStats     *DeltaStats `json:"deltaStats,omitempty"`
	DatasetVersion string      `json:"datasetVersion,omitempty"`
}

type TableVersionsResponse struct {
	TableName string         `json:"tableName"`
	Versions  []TableVersion `json:"versions"`
}

func (app *App) TableVersionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	catalogName := ps.ByName("name")
	schemaName := ps.ByName("schema")
	tableName := ps.ByName("table")

	marquezAPIURL := os.Getenv("MARQUEZ_API_URL")
	if marquezAPIURL == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("MARQUEZ_API_URL not configured"))
		return
	}

	// Build candidate dataset names to search in Marquez.
	// The pipeline emits: namespace={catalog}, dataset="milvus/{milvus_collection}".
	// We look up the table in Feast to get its storage_location and derive the Milvus collection name.
	candidates := []string{
		fmt.Sprintf("%s.%s", schemaName, tableName),
	}

	// Look up the table from Feast to get storage_location
	feastClient := newFeastClient()
	tableDetailURL := feastURL("/namespaces/%s/namespaces/%s/tables/%s", catalogName, schemaName, tableName)
	detailReq, _ := feastRequest(r, http.MethodGet, tableDetailURL, nil)
	detailResp, detailErr := feastClient.Do(detailReq)
	if detailErr == nil {
		dBody, _ := io.ReadAll(detailResp.Body)
		detailResp.Body.Close()
		var loadResp struct {
			Metadata struct {
				Location string `json:"location"`
			} `json:"metadata"`
		}
		if json.Unmarshal(dBody, &loadResp) == nil && strings.HasPrefix(loadResp.Metadata.Location, "milvus://") {
			parts := strings.SplitN(strings.TrimPrefix(loadResp.Metadata.Location, "milvus://"), "/", 2)
			if len(parts) == 2 {
				candidates = append(candidates, "milvus/"+parts[1])
			}
		}
	}

	if strings.HasPrefix(tableName, catalogName+"_") {
		stripped := strings.TrimPrefix(tableName, catalogName+"_")
		candidates = append(candidates, stripped)
	}

	client := newFeastClient()
	var body []byte
	var resp *http.Response
	for _, dsName := range candidates {
		versionsURL := fmt.Sprintf("%s/api/v1/namespaces/%s/datasets/%s/versions",
			marquezAPIURL, catalogName, url.PathEscape(dsName))
		var err error
		resp, err = client.Get(versionsURL)
		if err != nil {
			continue
		}
		body, _ = io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == 200 {
			break
		}
	}
	if body == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(TableVersionsResponse{
			TableName: fmt.Sprintf("%s.%s.%s", catalogName, schemaName, tableName),
			Versions:  []TableVersion{},
		})
		return
	}

	var marquezResp struct {
		Versions []struct {
			Version   string                 `json:"version"`
			CreatedAt string                 `json:"createdAt"`
			Facets    map[string]interface{} `json:"facets"`
		} `json:"versions"`
	}

	if err := json.Unmarshal(body, &marquezResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	result := TableVersionsResponse{
		TableName: fmt.Sprintf("%s.%s.%s", catalogName, schemaName, tableName),
		Versions:  make([]TableVersion, 0, len(marquezResp.Versions)),
	}

	seenDeltaVersions := make(map[int]bool)
	foundFirstCreate := false

	for _, v := range marquezResp.Versions {
		tv := TableVersion{
			Version:   v.Version,
			CreatedAt: v.CreatedAt,
		}

		if dvFacet, ok := v.Facets["datasetVersion"]; ok {
			if dvMap, ok := dvFacet.(map[string]interface{}); ok {
				if dv, ok := dvMap["datasetVersion"].(string); ok {
					tv.DatasetVersion = dv
				}
			}
		}

		if dsFacet, ok := v.Facets["deltaStats"]; ok {
			dsBytes, _ := json.Marshal(dsFacet)
			var ds DeltaStats
			if json.Unmarshal(dsBytes, &ds) == nil {
				if seenDeltaVersions[ds.DeltaVersion] {
					continue
				}
				if ds.Operation == "CREATE" {
					if foundFirstCreate {
						break
					}
					foundFirstCreate = true
				}
				seenDeltaVersions[ds.DeltaVersion] = true
				tv.DeltaStats = &ds
			}
		}

		result.Versions = append(result.Versions, tv)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
