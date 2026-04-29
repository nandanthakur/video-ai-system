import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { MinioClient } from "./minio-client";
import { KafkaProducer, ProcessingRequest } from "./kafka-producer";
import { PrimaryApiConfig } from "./types";

interface VideoRequest {
  camera_id: string;
  video_url: string;
  camera_type?: "normal" | "thermal";
  detection_configs?: Array<{
    detection_type: string;
    enabled: boolean;
  }>;
}

interface WorkflowRecord {
  workflowId: string;
  cameraId: string;
  videoUrl: string;
  cameraType: string;
  status: string;
  createdAt: string;
}

const app = express();
app.use(express.json());

let minioClient: MinioClient;
let kafkaProducer: KafkaProducer;
const workflows = new Map<string, WorkflowRecord>();

function createConfig(): PrimaryApiConfig {
  return {
    minio: {
      endpoint: process.env.MINIO_HOST || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
      bucket: process.env.MINIO_BUCKET || "video-ai",
      useSSL: process.env.MINIO_USE_SSL === "true",
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      topicPrefix: process.env.KAFKA_TOPIC_PREFIX || "video-ai",
    },
    vmsBridge: {
      baseUrl: process.env.VMS_BRIDGE_URL || "http://localhost:8001",
    },
    server: {
      port: parseInt(process.env.PRIMARY_API_PORT || "8000"),
    },
  };
}

async function initServices(config: PrimaryApiConfig): Promise<void> {
  minioClient = new MinioClient(config.minio);
  await minioClient.makeBucket();

  kafkaProducer = new KafkaProducer(config.kafka.brokers, config.kafka.topicPrefix);
  await kafkaProducer.connect();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/token", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    res.json({ token: "mock-jwt-token", expires_in: 3600 });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/process-video", async (req: Request, res: Response) => {
  try {
    const {
      camera_id,
      video_url,
      camera_type = "normal",
      detection_configs = [
        { detection_type: "person", enabled: true },
        { detection_type: "vehicle", enabled: true },
        { detection_type: "license_plate", enabled: true },
      ],
    } = req.body as VideoRequest;

    if (!camera_id || !video_url) {
      res.status(400).json({ error: "camera_id and video_url required" });
      return;
    }

    const workflowId = uuidv4();

    const savedVideoUrl = await minioClient.saveVideo(
      video_url,
      camera_id,
      workflowId
    );

    const request: ProcessingRequest = {
      workflowId,
      cameraId: camera_id,
      videoUrl: savedVideoUrl,
      cameraType: camera_type,
      detectionConfigs: detection_configs,
    };

    await kafkaProducer.sendProcessingRequest(request);

    const workflow: WorkflowRecord = {
      workflowId,
      cameraId: camera_id,
      videoUrl: savedVideoUrl,
      cameraType: camera_type,
      status: "accepted",
      createdAt: new Date().toISOString(),
    };
    workflows.set(workflowId, workflow);

    res.json({
      workflow_id: workflowId,
      status: "accepted",
      video_url: savedVideoUrl,
    });
  } catch (error) {
    console.error("Error processing video:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/workflow/:workflowId", async (req: Request, res: Response) => {
  const { workflowId } = req.params;
  const workflow = workflows.get(workflowId);

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.json(workflow);
});

app.get("/api/cameras", async (_req, res: Response) => {
  res.json({
    cameras: [
      { camera_id: "cam-001", name: "Front Entrance", camera_type: "normal" },
      { camera_id: "cam-002", name: "Back Parking", camera_type: "normal" },
    ],
  });
});

app.post("/api/cameras", async (req: Request, res: Response) => {
  const { camera_id, name, camera_type, detection_configs } = req.body;
  res.json({
    camera_id,
    name,
    camera_type,
    detection_configs,
  });
});

async function main() {
  const config = createConfig();
  await initServices(config);

  app.listen(config.server.port, () => {
    console.log(`Primary API listening on port ${config.server.port}`);
  });
}

main().catch(console.error);