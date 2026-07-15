package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type SharedClientLogic struct {
	Client kubernetes.Interface
	Logger *slog.Logger
	Token  BearerToken
}

// Service discovery helpers removed for minimal starter footprint.

func (kc *SharedClientLogic) BearerToken() (string, error) { return kc.Token.Raw(), nil }

func (kc *SharedClientLogic) GetGroups(ctx context.Context) ([]string, error) { return []string{}, nil }

// ListConnectionSecrets returns Secrets across all namespaces that are RHOAI Data Connections
// (label opendatahub.io/dashboard=true with a connection-type annotation).
func (kc *SharedClientLogic) ListConnectionSecrets(ctx context.Context) ([]corev1.Secret, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	secretList, err := kc.Client.CoreV1().Secrets("").List(ctx, metav1.ListOptions{
		LabelSelector: "opendatahub.io/dashboard=true",
	})
	if err != nil {
		kc.Logger.Error("failed to list connection secrets", "error", err)
		return nil, fmt.Errorf("failed to list connection secrets: %w", err)
	}

	var connections []corev1.Secret
	for _, s := range secretList.Items {
		annotations := s.Annotations
		if annotations == nil {
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type-protocol"]; ok {
			connections = append(connections, s)
			continue
		}
		if _, ok := annotations["opendatahub.io/connection-type-ref"]; ok {
			connections = append(connections, s)
		}
	}
	return connections, nil
}
