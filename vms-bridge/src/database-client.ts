import pkg from "pg";
const { Client } = pkg;
import { Camera } from "./types";

export class DatabaseClient {
  private client: pkg.Client;

  constructor(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.client = new Client(config);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async getCameras(): Promise<Camera[]> {
    const result = await this.client.query(
      "SELECT * FROM cameras ORDER BY name"
    );
    return result.rows.map(this.mapRowToCamera);
  }

  async getCamera(cameraId: string): Promise<Camera | null> {
    const result = await this.client.query(
      "SELECT * FROM cameras WHERE camera_id = $1",
      [cameraId]
    );
    return result.rows[0] ? this.mapRowToCamera(result.rows[0]) : null;
  }

  async getEnabledCameras(): Promise<Camera[]> {
    const result = await this.client.query(
      "SELECT * FROM cameras WHERE enabled = TRUE ORDER BY name"
    );
    return result.rows.map(this.mapRowToCamera);
  }

  async saveCamera(camera: Camera): Promise<Camera> {
    const existing = await this.getCamera(camera.cameraId);

    if (existing) {
      await this.client.query(
        `UPDATE cameras 
         SET name = $1, enabled = $2, camera_type = $3, hardware_id = $4, detection_configs = $5, 
             video_config = $6, status = $7, updated_at = NOW()
         WHERE camera_id = $8`,
        [
          camera.name,
          camera.enabled ?? true,
          camera.cameraType,
          camera.hardwareId,
          JSON.stringify(camera.detectionConfigs),
          JSON.stringify(camera.videoConfig),
          camera.status,
          camera.cameraId,
        ]
      );
    } else {
      await this.client.query(
        `INSERT INTO cameras (camera_id, name, enabled, camera_type, hardware_id, detection_configs, video_config, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          camera.cameraId,
          camera.name,
          camera.enabled ?? true,
          camera.cameraType,
          camera.hardwareId,
          JSON.stringify(camera.detectionConfigs),
          JSON.stringify(camera.videoConfig),
          camera.status,
        ]
      );
    }

    return camera;
  }

  async deleteCamera(cameraId: string): Promise<void> {
    await this.client.query("DELETE FROM cameras WHERE camera_id = $1", [cameraId]);
  }

  async initializeSchema(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        camera_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        camera_type VARCHAR(50) NOT NULL,
        hardware_id VARCHAR(255),
        detection_configs JSONB NOT NULL,
        video_config JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  private mapRowToCamera(row: Record<string, unknown>): Camera {
    return {
      cameraId: row.camera_id as string,
      name: row.name as string,
      enabled: row.enabled as boolean,
      cameraType: row.camera_type as "normal" | "thermal",
      hardwareId: row.hardware_id as string,
      status: row.status as string,
      detectionConfigs: JSON.parse(row.detection_configs as string),
      videoConfig: JSON.parse(row.video_config as string),
    };
  }
}