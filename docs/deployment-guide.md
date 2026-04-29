# Deployment Guide

This guide covers all deployment options for the Video AI Processing Platform.

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|------------|
| CPU | 16 cores | 32+ cores |
| RAM | 64 GB | 128 GB |
| GPU | 1 NVIDIA GPU (8GB VRAM) | 2+ NVIDIA GPUs (16GB VRAM each) |
| Storage | 1 TB SSD | 2+ TB NVMe SSD |
| Network | 1 Gbps | 10 Gbps |

### Software Requirements

- Docker 24.0+ / containerd
- Kubernetes 1.28+ (for K8s deployment)
- Helm 3.14+
- NVIDIA Driver 535+
- CUDA 12.2+

### Environment Requirements

- Firewall ports open for web UI access
- Network connectivity between services
- Sufficient storage for video retention

---

## Option 1: Docker Compose (Development)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/video-ai-system.git
cd video-ai-system

# 2. Copy environment template
cp .env.example .env

# 3. Edit environment variables
vim .env

# 4. Start services
docker-compose up -d

# 5. Check status
docker-compose ps

# 6. Access web UI
# Open http://localhost:8005
```

### Environment Variables

```bash
# Security - CHANGE THESE IN PRODUCTION!
MILESTONE_PASSWORD=your_password
POSTGRES_PASSWORD=postgres
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
SESSION_SECRET=change-this-secret
JWT_SECRET=change-this-jwt-secret

# Milestone VMS
MILESTONE_HOST=192.168.1.100
MILESTONE_PORT=443

# Video retention
DEFAULT_PRE_ALARM_SECONDS=5
DEFAULT_POST_ALARM_SECONDS=5
```

### Service Health Checks

```bash
# Check all services
curl http://localhost:8000/health  # Primary API
curl http://localhost:8001/health  # VMS Bridge
curl http://localhost:8005/health  # Web App

# Check monitoring
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health  # Grafana
curl http://localhost:9093/-/healthy # Alertmanager
```

###Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Stop specific service
docker-compose stop web-app
```

---

## Option 2: Kubernetes (Production)

### Prerequisites

```bash
# 1. Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/arm64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# 2. Install kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash

# 3. Configure kubectl
kubectl config use-context your-cluster
```

### Namespace Setup

```bash
# Create namespace
kubectl apply -f kubernetes/base/namespace.yml

# Verify
kubectl get ns video-ai
```

### Deploy Dev Environment

```bash
# Apply dev overlay
kubectl apply -k kubernetes/overlays/dev

# Check deployments
kubectl get deployments -n video-ai
kubectl get pods -n video-ai
```

### Deploy Production Environment

```bash
# Apply production overlay
kubectl apply -k kubernetes/overlays/prod

# Verify HPA is working
kubectl get hpa -n video-ai

# Check podDisruptionBudgets
kubectl get pdb -n video-ai
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n video-ai

# Check logs
kubectl logs -n video-ai -l app=primary-api

# Port forward for access
kubectl port-forward svc/primary-api 8000:8000 -n video-ai
kubectl port-forward svc/web-app 8005:8005 -n video-ai
```

### Scaling

```bash
# Scale manually
kubectl scale deployment primary-api --replicas=5 -n video-ai

# Or use HPA (automatic)
# HPA is already configured in production overlay
kubectl get hpa -n video-ai
```

### Update Deployment

```bash
# Rebuild images
docker build -t video-ai/primary-api:latest primary-api/
docker build -t video-ai/vms-bridge:latest vms-bridge/
docker build -t video-ai/temporal:latest temporal/
docker build -t video-ai/web-app:latest web-app/

# Push to registry
docker push your-registry/video-ai/primary-api:latest
# ... repeat for other services

# Rolling update
kubectl apply -k kubernetes/overlays/prod
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment primary-api -n video-ai

# Check rollout status
kubectl rollout status deployment primary-api -n video-ai
```

### Remove Deployment

```bash
# Remove all resources
kubectl delete -k kubernetes/overlays/prod

# Remove namespace
kubectl delete namespace video-ai
```

---

## Option 3: Helm (Alternative)

### Install Helm

```bash
# Install Helm
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Install Chart

```bash
# Create namespace
kubectl create namespace video-ai

# Install with default values
helm install video-ai ./helm/video-ai-system -n video-ai

# Install with custom values
helm install video-ai ./helm/video-ai-system -n video-ai \
  --values values-production.yaml
```

### Upgrade

```bash
# Upgrade existing release
helm upgrade video-ai ./helm/video-ai-system -n video-ai
```

### Uninstall

```bash
# Remove release
helm uninstall video-ai -n video-ai
```

---

## Monitoring Stack

### Docker Compose

```bash
# Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access
open http://localhost:3000  # Grafana (admin/admin123)
open http://localhost:9090  # Prometheus
open http://localhost:9093  # Alertmanager
```

### Kubernetes

```bash
# Install Prometheus Operator
kubectl apply -f https://operatorhub.io/install/prometheus-operator.yaml

# Or use pre-installed monitoring
# Grafana typically available at http://grafana.local:3000
```

### Configure Alerts

```bash
# Edit alert rules
kubectl edit configmap video-ai-rules -n monitoring

# Configure receivers
kubectl edit secret alertmanager-main -n monitoring
```

---

## GPU Configuration

### Docker

```bash
# Verify NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi

# Run with GPU
docker run --gpus all video-ai/temporal:latest
```

### Kubernetes

```bash
# Install NVIDIA Device Plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/deployments/static.yaml

# Verify
kubectl get pods -n kube-system -l app=nvidia-device-plugin
```

---

## Network Configuration

### Required Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Primary API | 8000 | HTTP | Video processing |
| VMS Bridge | 8001 | HTTP | VMS integration |
| Web App | 8005 | HTTP | Admin UI |
| MinIO | 9000 | HTTP | API |
| MinIO Console | 9001 | HTTP | Web UI |
| Postgres | 5432 | TCP | Database |
| Kafka | 9092 | TCP | Messaging |
| Prometheus | 9090 | HTTP | Metrics |
| Grafana | 3000 | HTTP | Dashboards |

### Network Policies

```yaml
# Example network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: primary-api-network-policy
spec:
  podSelector:
    matchLabels:
      app: primary-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: vms-bridge
        - podSelector:
            matchLabels:
              app: nginx
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
    - to:
        - podSelector:
            matchLabels:
              app: minio
```

---

## Security Hardening

### Docker

```bash
# Run as non-root
docker run -u 1000:1000 video-ai/primary-api:latest

# Read-only filesystem
docker run --read-only video-ai/primary-api:latest

# Limit capabilities
docker run --cap-drop=ALL video-ai/primary-api:latest
```

### Kubernetes

```yaml
# Security context example
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

---

## Backup and Recovery

### Database

```bash
# Backup
kubectl exec -n video-ai deploy/postgres -- pg_dump -U postgres video_ai > backup.sql

# Restore
kubectl exec -n video-ai deploy/postgres -- psql -U postgres video_ai < backup.sql
```

### MinIO

```bash
# Backup objects
mc mirror minio/video-ai backup/

# Restore
mc mirror backup/ minio/video-ai/
```

---

## Troubleshooting

### Common Issues

#### Pod not starting

```bash
kubectl describe pod <pod-name> -n video-ai
kubectl logs <pod-name> -n video-ai
```

#### GPU not available

```bash
# Check nvidia-smi
nvidia-smi

# Check device plugin
kubectl get pods -n kube-system | grep nvidia
```

#### Database connection failure

```bash
# Check service
kubectl get svc postgres -n video-ai

# Test connection
kubectl exec -it -n video-ai debug -- /bin/bash -c "telnet postgres 5432"
```

#### High latency

```bash
# Check resource usage
kubectl top pods -n video-ai
kubectl top nodes
```

### Logs

```bash
# All services
kubectl logs -n video-ai -l app=primary-api --tail=1000

# Specific service
kubectl logs -n video-ai deploy/primary-api --tail=100 -f
```

---

## Support

- Documentation: `docs/`
- Issue Tracker: GitHub Issues
- Slack: #video-ai-support