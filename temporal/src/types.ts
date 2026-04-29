export interface TemporalConfig {
  kafka: {
    brokers: string[];
    groupId: string;
    topic: string;
  };
  onnx: {
    normalModelPath: string;
    thermalModelPath: string;
    inferenceTimeout: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  vmsBridge: {
    baseUrl: string;
  };
}

export interface ProcessingRequest {
  workflowId: string;
  cameraId: string;
  videoUrl: string;
  cameraType: "normal" | "thermal";
  detectionTypes: string[];
  timestamp: string;
}

export interface CameraConfig {
  cameraId: string;
  cameraType: "normal" | "thermal";
  detectionConfigs: Array<{
    detectionType: string;
    enabled: boolean;
  }>;
}

export interface Detection {
  class: "person" | "vehicle" | "license_plate";
  confidence: number;
  bbox: number[];
  frameNumber: number;
}

export interface MovementResult {
  objectId: string;
  moving: boolean;
  direction: number[];
  speed: number;
}

export interface LicensePlateResult {
  plate: string;
  confidence: number;
  bbox: number[];
}

export interface AlarmDecision {
  alarmState: "OPEN" | "CLOSED";
  reason: string;
  detections: Detection[];
  movements: MovementResult[];
  licensePlates: LicensePlateResult[];
}

export interface WorkflowResult {
  workflowId: string;
  cameraId: string;
  videoName: string;
  frames: Array<{
    frameNumber: number;
    detections: Detection[];
    movements: MovementResult[];
    licensePlates: LicensePlateResult[];
  }>;
  alarmDecision: AlarmDecision;
  processedAt: string;
}