import { Camera } from "../../vms-bridge/src/types";

export const mockCamera: Camera = {
  cameraId: "cam-001",
  name: "Front Entrance",
  enabled: true,
  hardwareId: "hw-001",
  cameraType: "normal",
  status: "active",
  videoConfig: {
    preAlarmSeconds: 5,
    postAlarmSeconds: 5,
  },
  detectionConfigs: [
    { detectionType: "person", enabled: true },
    { detectionType: "vehicle", enabled: true },
    { detectionType: "license_plate", enabled: true },
  ],
};

export const mockThermalCamera: Camera = {
  cameraId: "cam-002",
  name: "Thermal Gate",
  enabled: true,
  hardwareId: "hw-002",
  cameraType: "thermal",
  status: "active",
  videoConfig: {
    preAlarmSeconds: 5,
    postAlarmSeconds: 5,
  },
  detectionConfigs: [
    { detectionType: "person", enabled: true },
  ],
};

export const mockDisabledCamera: Camera = {
  cameraId: "cam-003",
  name: "Disabled Camera",
  enabled: false,
  hardwareId: "hw-003",
  cameraType: "normal",
  status: "inactive",
  videoConfig: {
    preAlarmSeconds: 5,
    postAlarmSeconds: 5,
  },
  detectionConfigs: [
    { detectionType: "person", enabled: true },
  ],
};

export function createCamera(overrides: Partial<Camera> = {}): Camera {
  return { ...mockCamera, ...overrides };
}