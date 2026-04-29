"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseClient = void 0;
const pg_1 = __importDefault(require("pg"));
const { Client } = pg_1.default;
class DatabaseClient {
    constructor(config) {
        this.client = new Client(config);
    }
    async connect() {
        await this.client.connect();
    }
    async disconnect() {
        await this.client.end();
    }
    async getCameras() {
        const result = await this.client.query("SELECT * FROM cameras ORDER BY name");
        return result.rows.map(this.mapRowToCamera);
    }
    async getCamera(cameraId) {
        const result = await this.client.query("SELECT * FROM cameras WHERE camera_id = $1", [cameraId]);
        return result.rows[0] ? this.mapRowToCamera(result.rows[0]) : null;
    }
    async saveCamera(camera) {
        const existing = await this.getCamera(camera.cameraId);
        if (existing) {
            await this.client.query(`UPDATE cameras 
         SET name = $1, camera_type = $2, hardware_id = $3, detection_configs = $4, 
             video_config = $5, status = $6, updated_at = NOW()
         WHERE camera_id = $7`, [
                camera.name,
                camera.cameraType,
                camera.hardwareId,
                JSON.stringify(camera.detectionConfigs),
                JSON.stringify(camera.videoConfig),
                camera.status,
                camera.cameraId,
            ]);
        }
        else {
            await this.client.query(`INSERT INTO cameras (camera_id, name, camera_type, hardware_id, detection_configs, video_config, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                camera.cameraId,
                camera.name,
                camera.cameraType,
                camera.hardwareId,
                JSON.stringify(camera.detectionConfigs),
                JSON.stringify(camera.videoConfig),
                camera.status,
            ]);
        }
        return camera;
    }
    async deleteCamera(cameraId) {
        await this.client.query("DELETE FROM cameras WHERE camera_id = $1", [cameraId]);
    }
    async initializeSchema() {
        await this.client.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        camera_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
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
    mapRowToCamera(row) {
        return {
            cameraId: row.camera_id,
            name: row.name,
            cameraType: row.camera_type,
            hardwareId: row.hardware_id,
            status: row.status,
            detectionConfigs: JSON.parse(row.detection_configs),
            videoConfig: JSON.parse(row.video_config),
        };
    }
}
exports.DatabaseClient = DatabaseClient;
//# sourceMappingURL=database-client.js.map