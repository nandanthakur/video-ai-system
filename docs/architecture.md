```mermaid
flowchart TB
    subgraph VMS["VMS Layer"]
        Milestone["Milestone XProtect VMS"]
        AIC["AI Bridge"]
    end

    subgraph Core["Core Services"]
        direction TB
        
        VMSBridge["VMS Bridge<br/>:8001"]
        PrimaryAPI["Primary API<br/>:8000"]
        Temporal["Temporal Worker<br/>:7233"]
        WebApp["Web App<br/>:8005"]
        Notify["Notification<br/>:8006"]
    end

    subgraph Data["Data Layer"]
        Kafka["Kafka Broker<br/>:9092"]
        Postgres["PostgreSQL<br/>:5432"]
        MinIO["MinIO<br/>:9000/9001"]
    end

    subgraph AI["AI Inference"]
        YOLO["YOLOv7<br/>ONNX"]
        LP["License Plate<br/>Recognition"]
        Movement["Movement<br/>Detection"]
    end

    subgraph Infra["Infrastructure"]
        Prometheus["Prometheus<br/>:9090"]
        Grafana["Grafana<br/>:3000"]
        AlertManager["Alertmanager"]
    end

    subgraph Cloud["Cloud/Deployment"]
        K8s["Kubernetes<br/>Cluster"]
        GPU["GPU Nodes<br/>nvidia.com/gpu"]
    end

    subgraph External["External"]
        Teams["MS Teams"]
        Cameras["IP Cameras"]
    end

    %% Main flows
    Cameras -->|"RTSP"| Milestone
    Milestone -->|"Events"| AIC
    AIC -->|"GraphQL"| VMSBridge
    
    VMSBridge -->|"Alarm Trigger"| PrimaryAPI
    VMSBridge -->|"Sync Cameras"| Postgres
    
    PrimaryAPI -->|"Video Upload"| MinIO
    PrimaryAPI -->|"Process Request"| Kafka
    
    Kafka -->|"Consume"| Temporal
    
    Temporal -->|"Inference"| YOLO
    Temporal -->|"Inference"| LP
    Temporal -->|"Inference"| Movement
    
    Temporal -->|"Alarm Decision"| PrimaryAPI
    PrimaryAPI -->|"Set Alarm"| VMSBridge
    
    VMSBridge -->|"Alarm"| Notify
    Notify -->|"Teams Webhook"| Teams
    
    %% Monitoring
    Temporal -->|"Metrics"| Prometheus
    PrimaryAPI -->|"Metrics"| Prometheus
    VMSBridge -->|"Metrics"| Prometheus
    
    Prometheus -->|"Visualize"| Grafana
    Prometheus -->|"Alert"| AlertManager
    AlertManager -->|"Route"| Notify
    
    %% K8s Deployment
    K8s --> PrimaryAPI
    K8s --> VMSBridge
    K8s --> WebApp
    GPU --> Temporal
```

## Video AI System - Architecture Overview

```mermaid
flowchart LR
    subgraph Input["Input"]
        Camerasi["IP Cameras"]
    end
    
    subgraph Process["Processing Pipeline"]
        VMSBr["VMS Bridge"]
        API["Primary API"]
        KafkaK["Kafka"]
        Worker["Temporal Worker"]
        AI["AI Models"]
    end
    
    subgraph Storage["Storage"]
        MinIO["MinIO"]
        Postgres["PostgreSQL"]
    end
    
    subgraph Output["Output"]
        Teams1["MS Teams"]
        Graf["Grafana"]
        Dashboard["Dashboard"]
    end
    
    Camerasi -->|"RTSP"| VMSBr
    VMSBr -->|"Events"| API
    API -->|"Queue"| KafkaK
    KafkaK -->|"Consume"| Worker
    Worker -->|"Infer"| AI
    AI -->|"Results"| Worker
    Worker -->|"Store Video"| MinIO
    Worker -->|"Persist"| Postgres
    Worker -->|"Notify"| Teams1
    MinIO -->|"Display"| Dashboard
```

## Alarm Decision Logic

```mermaid
flowchart TD
    Start(["Alarm Triggered"]) --> GetCamera{"Get Camera<br/>Enabled?"}
    
    GetCamera -->|Yes| Detect["Run Detection"]
    GetCamera -->|No| Skip["Skip - Camera<br/>Disabled"]
    
    Detect --> Person{"Person<br/>Detected?"}
    
    Person -->|Yes| AlarmOPEN["ALARM = OPEN<br/>Reason: person"]
    Person -->|No| Vehicle{"Vehicle<br/>Detected?"}
    
    Vehicle -->|Yes| Moving{"Moving?"}
    Vehicle -->|No| Plate{"License Plate<br/>Detected?"}
    
    Moving -->|Yes| AlarmOPENv["ALARM = OPEN<br/>Reason: vehicle+moving"]
    Moving -->|No| CheckPlate
    
    CheckPlate -->|Yes| AlarmOPENp["ALARM = OPEN<br/>Reason: license plate"]
    CheckPlate -->|No| AlarmCLOSED["ALARM = CLOSED<br/>Reason: no detection"]
    
    AlarmOPEN --> Notify["Notify MS Teams"]
    AlarmOPENv --> Notify
    AlarmOPENp --> Notify
    AlarmCLOSED --> Notify
    
    Notify -->|"Webhook"| Teams["MS Teams"]
    
    style AlarmOPEN fill:#90EE90
    style AlarmOPENv fill:#90EE90
    style AlarmOPENp fill:#90EE90
    style AlarmCLOSED fill:#FFB6C1
```

## CI/CD Pipeline

```mermaid
flowchart LR
    A[Commit] --> B{Tests Pass?}
    B -->|No| C[Fix Code]
    C --> A
    B -->|Yes| D[Lint & TypeCheck]
    D -->|Fail| E[Fix Issues]
    E --> D
    D -->|Yes| F[Build Docker]
    F --> G[Security Scan]
    G -->|Vulns| H[Fix Security]
    H --> G
    G -->|Pass| I[Push to Registry]
    I --> J{Deploy?}
    J -->|Dev| K[Dev Cluster]
    J -->|Prod| L[Manual Approval]
    L --> M[Prod Cluster]
```

## Data Flow

```mermaid
sequenceDiagram
    participant C as IP Cameras
    participant VMS as Milestone VMS
    participant AI as AI Bridge
    participant VB as VMS Bridge
    participant API as Primary API
    participant K as Kafka
    participant T as Temporal Worker
    participant DB as PostgreSQL
    participant MinIO as MinIO
    participant Teams as MS Teams

    C->>VMS: RTSP Stream
    VMS->>AI: Analytics Events
    AI->>VB: GraphQL Events
    VB->>VB: Check Camera Enabled
    
    alt Camera Enabled
        VB->>API: POST /api/process-video
        API->>MinIO: Upload Video
        API->>K: Produce Message
        K->>T: Consume Message
        T->>T: Run YOLOv7 Inference
        T->>T: Detect Objects
        T->>T: Run Alarm Logic
        
        alt Alarm = OPEN
            T->>VB: Set Alarm OPEN
            VB->>Teams: Webhook Notification
        end
        
        T->>DB: Save Results
    else Camera Disabled
        VB->>VB: Skip Processing
    end
```

## Technology Stack

| Component | Technology |
|----------|------------|
| API | Express.js + TypeScript |
| Database | PostgreSQL |
| Message Queue | Kafka |
| Object Storage | MinIO |
| AI Inference | ONNX Runtime + YOLOv7 |
| Monitoring | Prometheus + Grafana |
| Deployment | Kubernetes + Helm |
| CI/CD | GitHub Actions |