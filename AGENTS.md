# AGENTS.md

This repo is a **design specification** — no implementation code exists here.

## Verified Sources

- `readme.md` — Quick start, API endpoints, camera config examples
- `kubernetes/` — K8s deployments
- `helm/` — Helm charts
- `docker-compose.monitoring.yml` — Monitoring stack
- `configs/config.yaml` — Single config source of truth
- `configs/fault-tolerance.yaml` — Retry/circuit breaker config
- `docs/gdpr-compliance.md` — GDPR compliance measures

## Project Structure

```
vms-bridge/       # Milestone AI Bridge integration
primary-api/      # Video processing API
temporal/         # AI workflow worker (ONNX inference)
web-app/          # Admin UI
notification-service/ # MS Teams alerts
kubernetes/       # K8s manifests + HPA + PDB
helm/            # Helm charts
infrastructure/  # Prometheus, Grafana, Loki, Alertmanager
configs/         # config.yaml, fault-tolerance.yaml
docs/            # GDPR compliance
```

## Service Ports

| Service | Port |
|--------|------|
| Primary API | 8000 |
| VMS Bridge | 8001 |
| Object Detection | 8002 |
| Movement Detection | 8003 |
| License Plate | 8004 |
| Web App | 8005 |
| MinIO | 9000/9001 |
| Postgres | 5432 |
| Temporal | 7233 |
| Kafka | 9092 |
| Prometheus | 9090 |
| Grafana | 3000 |

## API

- `POST /api/process-video` — Submit video (`{camera_id, video_url}`)
- `POST /token` — Login (`admin` / `admin123`)
- `GET /health` — Health check
- `GET /cameras` — List cameras
- `POST /cameras/sync` — Sync from VMS

## Alarm Logic

```
human → OPEN
vehicle + moving → OPEN
else → CLOSED
```

## Camera Types

- `normal`: person, vehicle, license_plate detection
- `thermal`: person only

## Required

- NVIDIA GPU for inference
- 16 cores, 64GB RAM, 1TB SSD minimum

## Deployment

### Kubernetes (Kustomize)

```bash
# Dev
kubectl apply -k kubernetes/overlays/dev

# Prod
kubectl apply -k kubernetes/overlays/prod
```

### Helm

```bash
helm install video-ai ./helm/video-ai-system
```

### Docker Compose

```bash
# Core services
docker-compose up -d

# Monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

## Autoscaling

| Service | Min | Max | Triggers |
|---------|-----|-----|----------|
| Primary API | 2 | 10 | CPU>70%, Memory>80% |
| Temporal Worker | 1 | 5 | CPU>70%, GPU>80%, Kafka lag>50 |

## Fault Tolerance

- **PodDisruptionBudgets** — minAvailable: 1 for all services
- **Retries**: 3 attempts with exponential backoff
- **Health Probes**: liveness, readiness, startup
- **Graceful Shutdown**: 30s termination + 10s preStop
- **Kafka**: acks=all for durability

## GDPR Compliance

- **Encryption**: TLS 1.3 in transit, AES-256 at rest (MinIO)
- **Data Retention**: Configurable (default 30 days video)
- **Access Control**: Role-based (admin/operator/system)
- **Audit Logging**: All actions logged to `audit_log` table
- **Data Subject Rights**: Export + deletion endpoints
- **Consent Tracking**: Camera consent records