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
	CatalogDetailPath   = ApiPathPrefix + "/catalogs/:name/detail"
	CatalogMembersPath  = ApiPathPrefix + "/catalogs/:name/members"
	SetCatalogAdminPath = ApiPathPrefix + "/catalogs/:name/set-admin"
)

type CatalogDetail struct {
	Name    string       `json:"name"`
	Comment string       `json:"comment"`
	Schemas []SchemaInfo `json:"schemas"`
	Members []MemberInfo `json:"members"`
}

type SchemaInfo struct {
	Name    string       `json:"name"`
	Comment string       `json:"comment"`
	Tables  []TableInfo  `json:"tables"`
	Volumes []VolumeInfo `json:"volumes"`
}

type TableInfo struct {
	Name            string       `json:"name"`
	Format          string       `json:"data_source_format"`
	TableType       string       `json:"table_type"`
	StorageLocation string       `json:"storage_location"`
	Comment         string       `json:"comment"`
	Columns         []ColumnInfo `json:"columns"`
}

type ColumnInfo struct {
	Name     string `json:"name"`
	TypeName string `json:"type_name"`
	Comment  string `json:"comment"`
	Position int    `json:"position"`
}

type VolumeInfo struct {
	Name            string `json:"name"`
	Type            string `json:"volume_type"`
	StorageLocation string `json:"storage_location"`
	Comment         string `json:"comment"`
}

type MemberInfo struct {
	Email      string   `json:"email"`
	Role       string   `json:"role"`
	Privileges []string `json:"privileges"`
}

func (app *App) CatalogDetailHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name := ps.ByName("name")
	client := newFeastClient()

	// Feast nested namespaces = schemas (always returns [["name", "default"]])
	schemasURL := feastURL("/namespaces/%s/namespaces", name)
	schemasReq, _ := feastRequest(r, http.MethodGet, schemasURL, nil)
	schemasResp, err := client.Do(schemasReq)

	var schemas []SchemaInfo
	if err == nil {
		body, _ := io.ReadAll(schemasResp.Body)
		schemasResp.Body.Close()

		var feastNS struct {
			Namespaces [][]string `json:"namespaces"`
		}
		json.Unmarshal(body, &feastNS)

		for _, ns := range feastNS.Namespaces {
			schemaName := "default"
			if len(ns) > 1 {
				schemaName = ns[1]
			}
			si := SchemaInfo{Name: schemaName}

			// Fetch tables for this schema
			tablesURL := feastURL("/namespaces/%s/namespaces/%s/tables", name, schemaName)
			tablesReq, _ := feastRequest(r, http.MethodGet, tablesURL, nil)
			tablesResp, tErr := client.Do(tablesReq)
			if tErr == nil {
				tBody, _ := io.ReadAll(tablesResp.Body)
				tablesResp.Body.Close()

				var tResult struct {
					Identifiers []struct {
						Namespace []string `json:"namespace"`
						Name      string   `json:"name"`
					} `json:"identifiers"`
				}
				json.Unmarshal(tBody, &tResult)

				for _, t := range tResult.Identifiers {
					ti := TableInfo{
						Name:      t.Name,
						TableType: "MANAGED",
					}

					// Fetch individual table details for columns
					tableDetailURL := feastURL("/namespaces/%s/namespaces/%s/tables/%s", name, schemaName, t.Name)
					detailReq, _ := feastRequest(r, http.MethodGet, tableDetailURL, nil)
					detailResp, dErr := client.Do(detailReq)
					if dErr == nil {
						dBody, _ := io.ReadAll(detailResp.Body)
						detailResp.Body.Close()

						var loadResp struct {
							MetadataLocation string `json:"metadata-location"`
							Metadata         struct {
								FormatVersion int               `json:"format-version"`
								Location      string            `json:"location"`
								Properties    map[string]string `json:"properties"`
								Schemas       []struct {
									Fields []struct {
										ID   int    `json:"id"`
										Name string `json:"name"`
										Type string `json:"type"`
									} `json:"fields"`
								} `json:"schemas"`
							} `json:"metadata"`
						}
						json.Unmarshal(dBody, &loadResp)

						ti.StorageLocation = loadResp.Metadata.Location
						ti.Comment = loadResp.Metadata.Properties["description"]
						if f := loadResp.Metadata.Properties["format"]; f != "" {
							ti.Format = f
						} else if strings.HasPrefix(loadResp.Metadata.Location, "milvus://") {
							ti.Format = "MILVUS"
						} else if loadResp.Metadata.FormatVersion > 0 {
							ti.Format = "ICEBERG"
						}
						if tt := loadResp.Metadata.Properties["table_type"]; tt != "" {
							ti.TableType = tt
						}

						if len(loadResp.Metadata.Schemas) > 0 {
							for i, f := range loadResp.Metadata.Schemas[0].Fields {
								ti.Columns = append(ti.Columns, ColumnInfo{
									Name:     f.Name,
									TypeName: f.Type,
									Position: i,
								})
							}
						}
					}

					si.Tables = append(si.Tables, ti)
				}
			}

			// Fetch volumes for this schema
			volsURL := feastURL("/namespaces/%s/namespaces/%s/volumes", name, schemaName)
			volsReq, _ := feastRequest(r, http.MethodGet, volsURL, nil)
			volsResp, vErr := client.Do(volsReq)
			if vErr == nil {
				vBody, _ := io.ReadAll(volsResp.Body)
				volsResp.Body.Close()

				var vResult struct {
					Volumes []struct {
						Name            string `json:"name"`
						VolumeType      string `json:"volume-type"`
						StorageLocation string `json:"storage-location"`
						Comment         string `json:"comment"`
					} `json:"volumes"`
				}
				json.Unmarshal(vBody, &vResult)

				for _, v := range vResult.Volumes {
					si.Volumes = append(si.Volumes, VolumeInfo{
						Name:            v.Name,
						Type:            v.VolumeType,
						StorageLocation: v.StorageLocation,
						Comment:         v.Comment,
					})
				}
			}

			schemas = append(schemas, si)
		}
	}

	detail := CatalogDetail{
		Name:    name,
		Schemas: schemas,
		Members: []MemberInfo{},
	}

	result, _ := json.Marshal(detail)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) SetCatalogAdminHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name := ps.ByName("name")
	var req struct {
		Email string `json:"email"`
	}
	body, _ := io.ReadAll(r.Body)
	json.Unmarshal(body, &req)

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","email":"%s","role":"Catalog Admin","catalog":"%s"}`, req.Email, name)
}

func (app *App) AddCatalogMemberHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name := ps.ByName("name")
	var req struct {
		Email string `json:"email"`
	}
	body, _ := io.ReadAll(r.Body)
	json.Unmarshal(body, &req)

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","email":"%s","catalog":"%s"}`, req.Email, name)
}
