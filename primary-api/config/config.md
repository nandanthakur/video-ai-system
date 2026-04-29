# Primary API Configuration

## Environment Variables

```
# MinIO
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=video-ai
MINIO_USE_SSL=false

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_PREFIX=video-ai

# VMS Bridge
VMS_BRIDGE_URL=http://localhost:8001

# Server
PRIMARY_API_PORT=8000
```

## API Endpoints

- `POST /token` — Login (`{"username": "admin", "password": "admin123"}`)
- `POST /api/process-video` — Submit video for processing
- `GET /api/workflow/:workflowId` — Get workflow status
- `GET /api/cameras` — List cameras
- `POST /api/cameras` — Create camera
- `GET /health` — Health check

## Kafka Message Format

```json
{
  "workflowId": "uuid",
  "cameraId": "cam-001",
  "videoUrl": "minio://video-ai/videos/cam-001/uuid/input.mp4",
  "cameraType": "normal",
  "detectionTypes": ["person", "vehicle", "license_plate"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Video Storage Path

```
minio://{bucket}/videos/{camera_id}/{workflow_id}/input.mp4
```