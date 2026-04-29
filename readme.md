# Video AI Processing Platform

Scalable video processing platform that processes alarm-triggered video clips from Video Management Systems (VMS) and executes AI workflows using GPU acceleration.

## Architecture

```
VMS Bridge → Primary API → Temporal → AI Pipeline → Alarm Decision
                           ↓
                    Object Detection (YOLOv7/ONNX)
                    Movement Detection
                    License Plate + OCR
```

## Quick Start

```bash
# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Primary API | 8000 | Entry point for video processing |
| VMS Bridge | 8001 | VMS integration (alarm polling) |
| Object Detection | 8002 | AI inference (GPU) |
| Movement Detection | 8003 | Vehicle motion tracking |
| License Plate | 8004 | Plate detection + OCR |
| Web App | 8005 | Admin UI |
| NGINX | 80 | API Gateway |
| MinIO | 9000/9001 | Video storage |
| Postgres | 5432 | Metadata database |
| Temporal | 7233 | Workflow engine |
| Kafka | 9092 | Message broker |
| Prometheus | 9090 | Metrics |
| Grafana | 3000 | Dashboards |
| Loki | 3100 | Logging |
| Alertmanager | 9093 | Alert routing |

## API Endpoints

- `POST /api/process-video` — Submit video for processing
- `GET /api/cameras` — List cameras (auth required)
- `POST /api/cameras` — Create camera
- `POST /token` — Login
- `GET /health` — Health check

## Camera Configuration

**Camera Types:**
- `normal` — Can detect person, vehicle, license plate
- `thermal` — Can only detect person

**Detection Types:**
- `person` — Always triggers alarm OPEN
- `vehicle` — Triggers alarm based on movement
- `license_plate` — Reads plate text

**Example:**
```json
{
  "camera_id": "cam-001",
  "name": "Front Entrance",
  "camera_type": "normal",
  "detection_configs": [
    {"detection_type": "person", "enabled": true},
    {"detection_type": "vehicle", "enabled": true},
    {"detection_type": "license_plate", "enabled": true}
  ]
}
```

**Default Admin:** `admin` / `admin123`

## Environment

- **GPU required** for AI inference
- **Minimum node**: 16 cores, 64GB RAM, 1 NVIDIA GPU, 1TB SSD

## VMS Integrations

- Milestone, Genetec, Avigilon, Hikvision, Axis, Bosch, Hanwha, Dahua, Motorola, Honeywell, Johnson Controls, Pelco, Qognify, NUUO

## Alarm Logic

```
IF human_detected:     alarm = OPEN
ELIF vehicle_detected:
  IF moving:           alarm = OPEN
  ELSE:                alarm = CLOSED
ELSE:                  alarm = CLOSED
```

## Deployment

### Docker Compose

```bash
# Core services
docker-compose up -d

# Monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

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
helm upgrade video-ai ./helm/video-ai-system
```

## Autoscaling

### Primary API HPA

- Scale: 2-10 replicas
- Metrics: CPU >70%, Memory >80%

### Temporal Worker HPA

- Scale: 1-5 replicas
- Metrics: CPU >70%, GPU >80%, Kafka lag >50

## Fault Tolerance

- **PodDisruptionBudgets** — minAvailable: 1 for all services
- **Retries**: 3 attempts with exponential backoff
- **Health Probes**: liveness, readiness, startup
- **Graceful Shutdown**: 30s termination + 10s preStop
- **Kafka**: acks=all for durability

## Monitoring

- **Prometheus** — Metrics collection
- **Grafana** — Dashboards
- **Loki** — Log aggregation
- **Alertmanager** — Alert routing
- **Node Exporter** — Server metrics
- **DCGM Exporter** — GPU metrics

### Alerts

- ServiceDown, HighProcessingLatency, WorkflowFailureRate
- HighCPUUsage, HighMemoryUsage, DiskSpaceLow
- GPUMemoryHigh, GPUUtilizationHigh, GPUTemperatureHigh
- PodCrashLooping, PodPending, NodeNotReady

## Configuration

Single source of truth: `configs/config.yaml`

```yaml
# VMS Configuration
vms:
  type: milestone
  milestone:
    host: "192.168.1.100"

# AI Models
ai:
  models:
    normal:
      path: "/models/yolov7-normal.onnx"
    thermal:
      path: "/models/yolov7-thermal.onnx"

# Infrastructure
infrastructure:
  postgres:
    host: "postgres"
  kafka:
    brokers: ["kafka:9092"]
```

## GDPR Compliance

- **Encryption**: TLS 1.3 in transit, AES-256 at rest (MinIO)
- **Data Retention**: Configurable (default 30 days)
- **Access Control**: Role-based (admin/operator/system)
- **Audit Logging**: All actions logged
- **Data Subject Rights**: Export + deletion endpoints
- **Consent Tracking**: Camera consent records