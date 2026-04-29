# Web App Configuration

## Environment Variables

```
# Server
WEB_APP_PORT=8005
SESSION_SECRET=your-secret-key

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=video_ai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# External Services
VMS_BRIDGE_URL=http://localhost:8001
PRIMARY_API_URL=http://localhost:8000
```

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Features

1. **Login** — Session-based authentication
2. **Sync Cameras** — Fetch cameras from VMS Bridge via `/cameras` endpoint
3. **Camera Management** — Add, edit, delete cameras
4. **Detection Config** — Enable/disable person, vehicle, license_plate detection
5. **Video Config** — Set pre-alarm and post-alarm seconds

## API Endpoints

- `POST /api/login` — Login
- `POST /api/logout` — Logout
- `GET /api/cameras` — List cameras
- `POST /api/cameras/sync` — Sync from VMS Bridge
- `GET /api/cameras/:id` — Get camera
- `PUT /api/cameras/:id` — Update camera
- `DELETE /api/cameras/:id` — Delete camera