# Temporal Worker Configuration

## Environment Variables

```
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=temporal-worker
KAFKA_TOPIC=video-ai-processing

# ONNX Models
NORMAL_MODEL_PATH=./models/yolov7-normal.onnx
THERMAL_MODEL_PATH=./models/yolov7-thermal.onnx

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=video_ai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# License Plate OCR
OCR_ENDPOINT=http://localhost:8004/ocr

# VMS Bridge
VMS_BRIDGE_URL=http://localhost:8001
```

## Models

- `models/yolov7-normal.onnx` — Person + Vehicle + License plate (normal cameras)
- `models/yolov7-thermal.onnx` — Person only (thermal cameras)

## Alarm Logic

```
IF person_detected:     alarm = OPEN
ELIF vehicle_detected:
  IF moving:           alarm = OPEN
  ELSE:                alarm = CLOSED
ELSE:                  alarm = CLOSED
```

## Database Schema

```sql
CREATE TABLE workflow_results (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) UNIQUE NOT NULL,
  camera_id VARCHAR(255) NOT NULL,
  alarm_state VARCHAR(50) NOT NULL,
  detections JSONB,
  movements JSONB,
  license_plates JSONB,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Kafka Message

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