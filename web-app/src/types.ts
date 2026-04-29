export interface WebAppConfig {
  server: {
    port: number;
    sessionSecret: string;
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
  primaryApi: {
    baseUrl: string;
  };
}

export interface Camera {
  id: string;
  name: string;
  enabled: boolean;
  cameraType: "normal" | "thermal";
  hardwareId: string;
  detectionConfigs: Array<{
    detectionType: "person" | "vehicle" | "license_plate";
    enabled: boolean;
  }>;
  videoConfig: {
    preAlarmSeconds: number;
    postAlarmSeconds: number;
  };
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "operator";
}

export interface WorkflowResult {
  workflowId: string;
  cameraId: string;
  alarmState: "OPEN" | "CLOSED";
  processedAt: string;
}