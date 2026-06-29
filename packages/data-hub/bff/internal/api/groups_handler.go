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
	GroupsPath = ApiPathPrefix + "/groups"
	GroupPath  = ApiPathPrefix + "/groups/:name"
)

type OCPGroup struct {
	APIVersion string   `json:"apiVersion"`
	Kind       string   `json:"kind"`
	Metadata   Metadata `json:"metadata"`
	Users      []string `json:"users"`
}

type Metadata struct {
	Name string `json:"name"`
}

type CreateGroupRequest struct {
	Name  string   `json:"name"`
	Users []string `json:"users"`
}

func (app *App) ListGroupsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	k8sURL := fmt.Sprintf("%s/apis/user.openshift.io/v1/groups", getK8sAPIURL())
	req, err := feastRequest(r, http.MethodGet, k8sURL, nil)
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

	var groupList struct {
		Items []OCPGroup `json:"items"`
	}
	json.Unmarshal(body, &groupList)

	filtered := []OCPGroup{}
	for _, g := range groupList.Items {
		if len(g.Metadata.Name) > 3 && g.Metadata.Name[:3] == "uc-" {
			filtered = append(filtered, g)
		}
	}

	result, _ := json.Marshal(map[string]any{"groups": filtered})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func (app *App) CreateGroupHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var req CreateGroupRequest
	body, _ := io.ReadAll(r.Body)
	if err := json.Unmarshal(body, &req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}

	groupName := "uc-" + req.Name
	client := newFeastClient()

	group := OCPGroup{
		APIVersion: "user.openshift.io/v1",
		Kind:       "Group",
		Metadata:   Metadata{Name: groupName},
		Users:      req.Users,
	}
	groupJSON, _ := json.Marshal(group)
	k8sURL := fmt.Sprintf("%s/apis/user.openshift.io/v1/groups", getK8sAPIURL())

	k8sReq, err := feastRequest(r, http.MethodPost, k8sURL, io.NopCloser(jsonReader(groupJSON)))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	groupResp, err := client.Do(k8sReq)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	groupResp.Body.Close()

	// Create Feast namespace matching group name
	feastBody := fmt.Sprintf(`{"namespace":["%s"],"properties":{}}`, req.Name)
	nsURL := feastURL("/namespaces")
	nsReq, _ := feastRequest(r, http.MethodPost, nsURL, strings.NewReader(feastBody))
	nsResp, err := client.Do(nsReq)
	if err != nil {
		app.logger.Error("Failed to create Feast namespace", "error", err, "namespace", req.Name)
	} else {
		nsResp.Body.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","group":"%s","catalog":"%s","members":%d}`, groupName, req.Name, len(req.Users))
}

func jsonReader(data []byte) io.Reader {
	return io.NopCloser(bytesReader(data))
}

type bytesReaderStruct struct {
	data []byte
	pos  int
}

func bytesReader(data []byte) *bytesReaderStruct {
	return &bytesReaderStruct{data: data}
}

func (br *bytesReaderStruct) Read(p []byte) (n int, err error) {
	if br.pos >= len(br.data) {
		return 0, io.EOF
	}
	n = copy(p, br.data[br.pos:])
	br.pos += n
	return n, nil
}

func (app *App) DeleteGroupHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name := ps.ByName("name")
	client := newFeastClient()

	k8sURL := fmt.Sprintf("%s/apis/user.openshift.io/v1/groups/%s", getK8sAPIURL(), name)
	k8sReq, _ := feastRequest(r, http.MethodDelete, k8sURL, nil)
	k8sResp, err := client.Do(k8sReq)
	if err == nil {
		k8sResp.Body.Close()
	}

	// Delete Feast namespace (name without uc- prefix)
	catalogName := name
	if len(name) > 3 && name[:3] == "uc-" {
		catalogName = name[3:]
	}
	nsURL := feastURL("/namespaces/%s", catalogName)
	nsReq, _ := feastRequest(r, http.MethodDelete, nsURL, nil)
	nsResp, err := client.Do(nsReq)
	if err == nil {
		nsResp.Body.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","deleted":"%s"}`, name)
}

func (app *App) ListOCPUsersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	k8sURL := fmt.Sprintf("%s/apis/user.openshift.io/v1/users", getK8sAPIURL())
	req, err := feastRequest(r, http.MethodGet, k8sURL, nil)
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
	var userList struct {
		Items []struct {
			Metadata struct {
				Name string `json:"name"`
			} `json:"metadata"`
		} `json:"items"`
	}
	json.Unmarshal(body, &userList)

	users := []string{}
	for _, u := range userList.Items {
		if u.Metadata.Name != "" {
			users = append(users, u.Metadata.Name)
		}
	}

	result, _ := json.Marshal(map[string]any{"users": users})
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}
