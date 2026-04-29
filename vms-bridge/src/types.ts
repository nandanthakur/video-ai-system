export interface VmsConfig {
  type: "milestone";
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface AiBridgeConfig {
  host: string;
  port: number;
  graphqlEndpoint: string;
  videoProxyPort: number;
  healthPort: number;
}

export interface ProcessingConfig {
  pollIntervalSeconds: number;
  cameraFilter: string[];
  alarmTriggerTypes: string[];
}

export interface IvaConfig {
  applicationId: string;
  applicationName: string;
  topics: Array<{
    name: string;
    enabled: boolean;
  }>;
}

export interface VideoConfig {
  rtspTransport: "tcp" | "udp";
  defaultPreAlarmSeconds: number;
  defaultPostAlarmSeconds: number;
  maxFramerate: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface PrimaryApiConfig {
  baseUrl: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface MilestoneConfig {
  vms: VmsConfig;
  aiBridge: AiBridgeConfig;
  processing: ProcessingConfig;
  iva: IvaConfig;
  video: VideoConfig;
  primaryApi: PrimaryApiConfig;
  database: DatabaseConfig;
}

export interface Camera {
  cameraId: string;
  name: string;
  enabled: boolean;
  hardwareId: string;
  cameraType: "normal" | "thermal";
  status: string;
  videoConfig: {
    preAlarmSeconds: number;
    postAlarmSeconds: number;
  };
  detectionConfigs: Array<{
    detectionType: string;
    enabled: boolean;
  }>;
}

export interface VmsCamera {
  cameraId: string;
  name: string;
  hardwareId: string;
  status: string;
}

export interface AlarmEvent {
  id: string;
  cameraId: string;
  timestamp: string;
  eventType: string;
  metadata: Record<string, unknown>;
}

export interface AlarmUpdate {
  alarmState: "OPEN" | "CLOSED";
  reason: string;
}

export interface VideoRequest {
  workflowId: string;
  cameraId: string;
  cameraType: "normal" | "thermal";
  videoConfig: {
    preAlarmSeconds: number;
    postAlarmSeconds: number;
  };
  detectionConfigs: Array<{
    detectionType: string;
    enabled: boolean;
  }>;
}