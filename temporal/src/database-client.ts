import pkg from "pg";
const { Client } = pkg;

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

  async saveWorkflowResult(result: {
    workflowId: string;
    cameraId: string;
    alarmState: string;
    detections: unknown[];
    movements: unknown[];
    licensePlates: unknown[];
    processedAt: string;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO workflow_results 
       (workflow_id, camera_id, alarm_state, detections, movements, license_plates, processed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        result.workflowId,
        result.cameraId,
        result.alarmState,
        JSON.stringify(result.detections),
        JSON.stringify(result.movements),
        JSON.stringify(result.licensePlates),
        result.processedAt,
      ]
    );
  }

  async getWorkflowResult(workflowId: string): Promise<unknown> {
    const result = await this.client.query(
      "SELECT * FROM workflow_results WHERE workflow_id = $1",
      [workflowId]
    );
    return result.rows[0];
  }

  async initializeSchema(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS workflow_results (
        id SERIAL PRIMARY KEY,
        workflow_id VARCHAR(255) UNIQUE NOT NULL,
        camera_id VARCHAR(255) NOT NULL,
        alarm_state VARCHAR(50) NOT NULL,
        detections JSONB,
        movements JSONB,
        license_plates JSONB,
        processed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_results_camera_id 
      ON workflow_results(camera_id)
    `);

    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_results_processed_at 
      ON workflow_results(processed_at)
    `);
  }
}