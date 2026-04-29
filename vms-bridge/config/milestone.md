# VMS Bridge - Milestone Integration

## Config (`config/milestone.md`)

## Environment Variables

```
# Milestone VMS
MILESTONE_HOST=192.168.1.100
MILESTONE_PORT=443
MILESTONE_USERNAME=admin
MILESTONE_PASSWORD=your_password

# AI Bridge
AI_BRIDGE_HOST=localhost
AI_BRIDGE_PORT=4000
AI_BRIDGE_GRAPHQL_ENDPOINT=http://localhost:4000/api/bridge/graphql
AI_BRIDGE_VIDEO_PROXY_PORT=8787
AI_BRIDGE_HEALTH_PORT=3500

# Processing
POLL_INTERVAL_SECONDS=10
CAMERA_FILTER=                    # Comma-separated camera IDs, empty = all
ALARM_TRIGGER_TYPES=motion_detection,analytics_event

# IVA Application
IVA_APPLICATION_ID=video-ai-system
IVA_APPLICATION_NAME=Video AI Processing Platform

# Video Settings
RTSP_TRANSPORT=tcp
DEFAULT_PRE_ALARM_SECONDS=5
DEFAULT_POST_ALARM_SECONDS=5
MAX_FRAMERATE=5
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720

# Primary API
PRIMARY_API_URL=http://localhost:8000

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=video_ai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Startup
SYNC_CAMERAS_ON_STARTUP=true

# Server
VMS_BRIDGE_PORT=8001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/health` | Health check |
| POST | `/start` | Start VMS bridge |
| POST | `/stop` | Stop VMS bridge |
| GET | `/cameras` | List cameras from database |
| POST | `/cameras/sync` | Sync cameras from VMS |
| GET | `/cameras/:cameraId` | Get camera details |
| PUT | `/cameras/:cameraId` | Update camera config |
| DELETE | `/cameras/:cameraId` | Delete camera |
| POST | `/alarm` | Set alarm (OPEN/CLOSED) |
| POST | `/callback` | IVA callback handler |

## Alarm Update Request

```json
POST /alarm
{
  "cameraId": "cam-001",
  "alarmState": "CLOSED",
  "reason": "No movement detected",
  "workflowId": "wf-123"
}
```

## Video Fetch Flow

1. VMS detects alarm → triggers callback
2. VMS Bridge gets camera config from database (pre/post alarm seconds)
3. Fetches video from VMS via RTSP proxy
4. Sends video to Primary API → Kafka

## Database Schema

```sql
CREATE TABLE cameras (
  camera_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  camera_type VARCHAR(50) NOT NULL,
  hardware_id VARCHAR(255),
  detection_configs JSONB NOT NULL,
  video_config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Camera Config Example

```json
{
  "cameraId": "cam-001",
  "name": "Front Entrance",
  "cameraType": "normal",
  "hardwareId": "hw-001",
  "status": "active",
  "videoConfig": {
    "preAlarmSeconds": 5,
    "postAlarmSeconds": 5
  },
  "detectionConfigs": [
    { "detectionType": "person", "enabled": true },
    { "detectionType": "vehicle", "enabled": true },
    { "detectionType": "license_plate", "enabled": true }
  ]
}
```