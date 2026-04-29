import { KafkaConsumer } from "./kafka-consumer";
import { DatabaseClient } from "./database-client";
import { VideoProcessor } from "./video-processor";
import { ObjectDetector } from "./onnx-client";
import { LicensePlateDetector } from "./license-plate-detector";
import { ProcessingRequest, WorkflowResult, CameraConfig } from "./types";

interface WorkerConfig {
  kafka: {
    brokers: string[];
    groupId: string;
    topic: string;
  };
  onnx: {
    normalModelPath: string;
    thermalModelPath: string;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  licensePlateOcr: {
    endpoint: string;
  };
  vmsBridge: {
    baseUrl: string;
  };
}

export class TemporalWorker {
  private config: WorkerConfig;
  private kafkaConsumer: KafkaConsumer;
  private database: DatabaseClient;
  private videoProcessor: VideoProcessor;
  private cameraConfigs = new Map<string, CameraConfig>();

  constructor(config: WorkerConfig) {
    this.config = config;
    this.kafkaConsumer = new KafkaConsumer(
      config.kafka.brokers,
      config.kafka.groupId,
      config.kafka.topic
    );
    this.database = new DatabaseClient(config.database);
  }

  async start(): Promise<void> {
    await this.database.connect();
    await this.database.initializeSchema();
    await this.kafkaConsumer.connect();

    await this.kafkaConsumer.start(async (request: ProcessingRequest) => {
      await this.processWorkflow(request);
    });

    console.log("Temporal worker started");
  }

  async stop(): Promise<void> {
    await this.kafkaConsumer.disconnect();
    await this.database.disconnect();
    console.log("Temporal worker stopped");
  }

  private async processWorkflow(request: ProcessingRequest): Promise<void> {
    console.log("Processing workflow:", request.workflowId);

    try {
      const cameraConfig = this.cameraConfigs.get(request.cameraId) || {
        cameraId: request.cameraId,
        cameraType: request.cameraType,
        detectionConfigs: request.detectionTypes.map((t) => ({
          detectionType: t,
          enabled: true,
        })),
      };

      const result = await this.videoProcessor.process(
        request.videoUrl,
        request.workflowId,
        request.cameraType,
        request.detectionTypes
      );

      result.cameraId = request.cameraId;

      await this.database.saveWorkflowResult({
        workflowId: result.workflowId,
        cameraId: result.cameraId,
        alarmState: result.alarmDecision.alarmState,
        detections: result.alarmDecision.detections,
        movements: result.alarmDecision.movements,
        licensePlates: result.alarmDecision.licensePlates,
        processedAt: result.processedAt,
      });

      await this.notifyVmsBridge(result);

      console.log("Workflow completed:", {
        workflowId: request.workflowId,
        alarmState: result.alarmDecision.alarmState,
        reason: result.alarmDecision.reason,
      });
    } catch (error) {
      console.error("Workflow failed:", error);
      await this.sendAlarmUpdate(request.workflowId, request.cameraId, "CLOSED", "Processing failed");
    }
  }

  private async notifyVmsBridge(result: WorkflowResult): Promise<void> {
    const { alarmState, reason } = result.alarmDecision;

    await this.sendAlarmUpdate(
      result.workflowId,
      result.cameraId,
      alarmState,
      reason
    );
  }

  private async sendAlarmUpdate(
    workflowId: string,
    cameraId: string,
    alarmState: "OPEN" | "CLOSED",
    reason: string
  ): Promise<void> {
    try {
      await fetch(`${this.config.vmsBridge.baseUrl}/alarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          cameraId,
          alarmState,
          reason,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to notify VMS bridge:", error);
    }
  }

  registerCameraConfig(config: CameraConfig): void {
    this.cameraConfigs.set(config.cameraId, config);
  }
}

function createConfig(): WorkerConfig {
  return {
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      groupId: process.env.KAFKA_GROUP_ID || "temporal-worker",
      topic: process.env.KAFKA_TOPIC || "video-ai-processing",
    },
    onnx: {
      normalModelPath: process.env.NORMAL_MODEL_PATH || "./models/yolov7-normal.onnx",
      thermalModelPath: process.env.THERMAL_MODEL_PATH || "./models/yolov7-thermal.onnx",
    },
    database: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "video_ai",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
    },
    licensePlateOcr: {
      endpoint: process.env.OCR_ENDPOINT || "http://localhost:8004/ocr",
    },
    vmsBridge: {
      baseUrl: process.env.VMS_BRIDGE_URL || "http://localhost:8001",
    },
  };
}

async function main() {
  const config = createConfig();
  const worker = new TemporalWorker(config);
  await worker.start();
}

main().catch(console.error);