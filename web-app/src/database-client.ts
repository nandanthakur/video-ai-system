import pkg from "pg";
const { Client } = pkg;
import { Camera, User } from "./types";

export class DatabaseClient {
  private client: Client;

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

  async getCamera(id: string): Promise<Camera | null> {
    const result = await this.client.query(
      "SELECT * FROM cameras WHERE id = $1",
      [id]
    );
    return result.rows[0] ? this.mapRowToCamera(result.rows[0]) : null;
  }

  async saveCamera(camera: Camera): Promise<Camera> {
    const existing = await this.getCamera(camera.id);

    if (existing) {
      await this.client.query(
        `UPDATE cameras 
         SET name = $1, enabled = $2, camera_type = $3, detection_configs = $4, 
             video_config = $5, updated_at = NOW()
         WHERE id = $6`,
        [
          camera.name,
          camera.enabled,
          camera.cameraType,
          JSON.stringify(camera.detectionConfigs),
          JSON.stringify(camera.videoConfig),
          camera.id,
        ]
      );
    } else {
      await this.client.query(
        `INSERT INTO cameras (id, name, enabled, camera_type, hardware_id, detection_configs, video_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          camera.id,
          camera.name,
          camera.enabled ?? true,
          camera.cameraType,
          camera.hardwareId,
          JSON.stringify(camera.detectionConfigs),
          JSON.stringify(camera.videoConfig),
        ]
      );
    }

    return camera;
  }

  async deleteCamera(id: string): Promise<void> {
    await this.client.query("DELETE FROM cameras WHERE id = $1", [id]);
  }

  async authenticateUser(
    username: string,
    password: string
  ): Promise<User | null> {
    const result = await this.client.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    return result.rows[0] || null;
  }

  async initializeSchema(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        camera_type VARCHAR(50) NOT NULL,
        hardware_id VARCHAR(255),
        detection_configs JSONB NOT NULL,
        video_config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.client.query(`
      INSERT INTO users (username, password, role)
      VALUES ('admin', 'admin123', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);
  }

  private mapRowToCamera(row: Record<string, unknown>): Camera {
    return {
      id: row.id as string,
      name: row.name as string,
      enabled: row.enabled as boolean,
      cameraType: row.camera_type as "normal" | "thermal",
      hardwareId: row.hardware_id as string,
      detectionConfigs: JSON.parse(row.detection_configs as string),
      videoConfig: JSON.parse(row.video_config as string),
    };
  }
}