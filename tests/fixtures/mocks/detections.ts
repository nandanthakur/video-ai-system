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

export interface DetectionResult {
  person?: { detected: boolean; confidence: number; count: number };
  vehicle?: { detected: boolean; confidence: number; count: number };
  movement?: { detected: boolean; confidence: number };
  licensePlate?: { detected: boolean; confidence: number; count: number; plates: string[] };
}

export const mockPersonDetection: DetectionResult = {
  person: { detected: true, confidence: 0.9, count: 2 },
};

export const mockVehicleMovingDetection: DetectionResult = {
  vehicle: { detected: true, confidence: 0.85, count: 1 },
  movement: { detected: true, confidence: 0.8 },
};

export const mockNoDetection: DetectionResult = {
  person: { detected: false, confidence: 0, count: 0 },
  vehicle: { detected: false, confidence: 0, count: 0 },
  movement: { detected: false, confidence: 0 },
  licensePlate: { detected: false, confidence: 0, count: 0, plates: [] },
};