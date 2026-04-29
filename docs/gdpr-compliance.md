# GDPR Compliance

## Overview

The Video AI Platform implements comprehensive GDPR compliance measures including data minimization, encryption, retention policies, and data subject rights.

## Data Processing Principles

| Principle | Implementation |
|------------|----------------|
| **Lawfulness** | Explicit consent for video processing |
| **Purpose Limitation** | Video only used for security/alarm processing |
| **Data Minimization** | Only necessary metadata stored |
| **Accuracy** | Detection results timestamped and verifiable |
| **Storage Limitation** | Configurable retention periods |
| **Integrity & Confidentiality** | TLS + encryption at rest |

## Data Categories

### Personal Data Processed

- **Video footage** - Contains biometric data (faces, license plates)
- **Camera locations** - Building/facility mapping
- **Detection events** - Timestamps, alarm states
- **User credentials** - Admin access

### Legal Basis

- **Legitimate Interest** - Security monitoring
- **Consent** - Camera configuration by admins

## Technical Measures

### Encryption

```yaml
# In transit
- TLS 1.3 for all API communications
- WSS for real-time video streams

# At rest
- MinIO: AES-256 encryption
- PostgreSQL: pgcrypto extension
```

### Access Control

```yaml
# Role-based access
- admin: Full access
- operator: View only
- system: Processing only (service accounts)

# Network policies
- Internal communication only
- No direct database access from outside
```

### Data Retention

```yaml
retention:
  video:
    default_days: 30
    min_days: 7
    max_days: 365
  
  detection_events:
    default_days: 90
    max_days: 730
  
  user_logs:
    default_days: 365
  
  workflow_results:
    default_days: 365
```

### Data Anonymization

```python
# License plate data can be hashed
def anonymize_license_plate(plate: str) -> str:
    return hashlib.sha256(plate.encode()).hexdigest()[:12]

# Video frames can be stripped of metadata
def strip_metadata(frame: bytes) -> bytes:
    # Remove GPS, timestamp, camera info
    return cleaned_frame
```

## Data Subject Rights

### Right to Access

```sql
-- User can request their data
SELECT * FROM workflow_results 
WHERE camera_id IN (
  SELECT camera_id FROM cameras 
  WHERE owner_id = 'user-request-id'
);
```

### Right to Erasure

```bash
# Delete all data for a camera
DELETE FROM detection_events WHERE camera_id = 'cam-001';
DELETE FROM workflow_results WHERE camera_id = 'cam-001';
-- Video files automatically removed via lifecycle policy
```

### Right to Portability

```python
def export_user_data(user_id: str) -> dict:
    return {
        "cameras": get_cameras(user_id),
        "detection_events": get_detection_events(user_id),
        "user_settings": get_settings(user_id),
        "export_date": datetime.now()
    }
```

## Consent Management

### Camera Opt-In

```yaml
# Camera must have explicit consent record
camera:
  id: cam-001
  consent:
    recorded: true
    date: "2024-01-15"
    purpose: "security_monitoring"
    can_process: true
  
  # Can be disabled for GDPR
  data_processing_enabled: true
```

### Processing Notifications

```python
def on_detection(event: DetectionEvent):
    # Log processing activity
    audit_log.log(
        action="detection_processed",
        camera_id=event.camera_id,
        has_biometric_data=True,
        timestamp=event.timestamp
    )
```

## Audit Logging

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    camera_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Logged actions
-- - camera_created, camera_updated, camera_deleted
-- - detection_started, detection_completed
-- - user_login, user_logout
-- - data_exported, data_deleted
```

## Deployment Configuration

```yaml
# GDPR-specific settings
gdpr:
  enforce_encryption: true
  require_consent: true
  default_retention_days: 30
  enable_audit_log: true
  allow_data_export: true
  allow_data_deletion: true
  
  # Anonymization options
  anonymize:
    license_plates: true
    faces: false  # Keep faces for security
    timestamps: false
```

## Compliance Checklist

- [x] Data encryption at rest and in transit
- [x] Role-based access control
- [x] Configurable data retention
- [x] Audit logging
- [x] Data subject access requests
- [x] Data deletion capability
- [x] Consent tracking
- [x] Privacy by design
- [x] Data portability exports
- [x] Processing notifications