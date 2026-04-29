import { Camera } from "./types";
import { DatabaseClient } from "./database-client";

export class CameraService {
  private db: DatabaseClient;
  private vmsBridgeUrl: string;

  constructor(db: DatabaseClient, vmsBridgeUrl: string) {
    this.db = db;
    this.vmsBridgeUrl = vmsBridgeUrl;
  }

  async syncCamerasFromVmsBridge(): Promise<Camera[]> {
    const response = await fetch(`${this.vmsBridgeUrl}/cameras`);
    if (!response.ok) {
      throw new Error(`Failed to fetch cameras: ${response.statusText}`);
    }

    const vmsCameras = await response.json();

    const cameras: Camera[] = [];
    for (const vmsCam of vmsCameras.cameras || []) {
      const existingCamera = await this.db.getCamera(vmsCam.camera_id);

      const camera: Camera = existingCamera || {
        id: vmsCam.camera_id,
        name: vmsCam.name || vmsCam.camera_id,
        enabled: true,
        cameraType: this.inferCameraType(vmsCam),
        hardwareId: vmsCam.hardwareId || vmsCam.camera_id,
        detectionConfigs: [
          { detectionType: "person", enabled: true },
          { detectionType: "vehicle", enabled: true },
          { detectionType: "license_plate", enabled: true },
        ],
        videoConfig: {
          preAlarmSeconds: 5,
          postAlarmSeconds: 5,
        },
      };

      await this.db.saveCamera(camera);
      cameras.push(camera);
    }

    return cameras;
  }

  private inferCameraType(vmsCam: Record<string, unknown>): "normal" | "thermal" {
    const name = (vmsCam.name as string || "").toLowerCase();
    if (name.includes("thermal") || name.includes("ir")) {
      return "thermal";
    }
    return "normal";
  }

  async getCameras(): Promise<Camera[]> {
    return this.db.getCameras();
  }

  async getCamera(id: string): Promise<Camera | null> {
    return this.db.getCamera(id);
  }

  async updateCamera(camera: Camera): Promise<Camera> {
    return this.db.saveCamera(camera);
  }

  async deleteCamera(id: string): Promise<void> {
    return this.db.deleteCamera(id);
  }
}