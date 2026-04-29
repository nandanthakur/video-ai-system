import express, { Request, Response } from "express";
import { MilestoneBridge } from "./milestone-bridge";
import { MilestoneConfig, Camera, VideoRequest, AlarmUpdate } from "./types";
import { DatabaseClient } from "./database-client";
import { VideoFetcher } from "./video-fetcher";

const app = express();
app.use(express.json());

let bridge: MilestoneBridge;
let db: DatabaseClient;
let videoFetcher: VideoFetcher;

function createConfig(): MilestoneConfig {
  return {
    vms: {
      type: "milestone",
      host: process.env.MILESTONE_HOST || "localhost",
      port: parseInt(process.env.MILESTONE_PORT || "443"),
      username: process.env.MILESTONE_USERNAME || "admin",
      password: process.env.MILESTONE_PASSWORD || "",
    },
    aiBridge: {
      host: process.env.AI_BRIDGE_HOST || "localhost",
      port: parseInt(process.env.AI_BRIDGE_PORT || "4000"),
      graphqlEndpoint: process.env.AI_BRIDGE_GRAPHQL_ENDPOINT || "http://localhost:4000/api/bridge/graphql",
      videoProxyPort: parseInt(process.env.AI_BRIDGE_VIDEO_PROXY_PORT || "8787"),
      healthPort: parseInt(process.env.AI_BRIDGE_HEALTH_PORT || "3500"),
    },
    processing: {
      pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS || "10"),
      cameraFilter: (process.env.CAMERA_FILTER || "").split(",").filter(Boolean),
      alarmTriggerTypes: (process.env.ALARM_TRIGGER_TYPES || "motion_detection,analytics_event").split(","),
    },
    iva: {
      applicationId: process.env.IVA_APPLICATION_ID || "video-ai-system",
      applicationName: process.env.IVA_APPLICATION_NAME || "Video AI Processing Platform",
      topics: [
        { name: "person_detection", enabled: true },
        { name: "vehicle_detection", enabled: true },
        { name: "license_plate", enabled: true },
      ],
    },
    video: {
      rtspTransport: (process.env.RTSP_TRANSPORT as "tcp" | "udp") || "tcp",
      defaultPreAlarmSeconds: parseInt(process.env.DEFAULT_PRE_ALARM_SECONDS || "5"),
      defaultPostAlarmSeconds: parseInt(process.env.DEFAULT_POST_ALARM_SECONDS || "5"),
      maxFramerate: parseInt(process.env.MAX_FRAMERATE || "5"),
      resolution: {
        width: parseInt(process.env.VIDEO_WIDTH || "1280"),
        height: parseInt(process.env.VIDEO_HEIGHT || "720"),
      },
    },
    primaryApi: {
      baseUrl: process.env.PRIMARY_API_URL || "http://localhost:8000",
    },
    database: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "video_ai",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
    },
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/start", async (_req, res) => {
  try {
    await bridge.start();
    res.json({ status: "started" });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/stop", async (_req, res) => {
  try {
    await bridge.stop();
    res.json({ status: "stopped" });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/callback", async (req: Request, res: Response) => {
  const { cameraId, eventType, metadata } = req.body;
  console.log("Received callback:", { cameraId, eventType, metadata });
  res.json({ success: true });
});

app.get("/cameras", async (_req: Request, res: Response) => {
  try {
    const enabledOnly = _req.query.enabled === "true";
    const cameras = enabledOnly 
      ? await db.getEnabledCameras()
      : await db.getCameras();
    res.json({ cameras });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/cameras/sync", async (_req: Request, res: Response) => {
  try {
    const vmsCameras = await bridge.getCamerasFromVms();
    for (const vmsCam of vmsCameras) {
      const existing = await db.getCamera(vmsCam.cameraId);
      if (!existing) {
        const newCamera: Camera = {
          cameraId: vmsCam.cameraId,
          name: vmsCam.name,
          enabled: true,
          hardwareId: vmsCam.hardwareId,
          cameraType: inferCameraType(vmsCam.name),
          status: vmsCam.status,
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
        await db.saveCamera(newCamera);
      }
    }
    const cameras = await db.getCameras();
    res.json({ success: true, cameras });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/cameras/:cameraId", async (req: Request, res: Response) => {
  try {
    const camera = await db.getCamera(req.params.cameraId);
    if (!camera) {
      res.status(404).json({ error: "Camera not found" });
      return;
    }
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.put("/cameras/:cameraId", async (req: Request, res: Response) => {
  try {
    const camera: Camera = {
      ...req.body,
      cameraId: req.params.cameraId,
    };
    await db.saveCamera(camera);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.delete("/cameras/:cameraId", async (req: Request, res: Response) => {
  try {
    await db.deleteCamera(req.params.cameraId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/alarm", async (req: Request, res: Response) => {
  try {
    const { cameraId, alarmState, reason, workflowId } = req.body as AlarmUpdate & { cameraId: string; workflowId?: string };
    await bridge.setAlarm(cameraId, alarmState, reason);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

async function handleAlarmTriggered(alarm: { cameraId: string; eventType: string }) {
  console.log("Alarm triggered:", alarm);

  const camera = await db.getCamera(alarm.cameraId);
  if (!camera) {
    console.error("Camera not found:", alarm.cameraId);
    return;
  }

  if (camera.enabled === false) {
    console.log("Camera disabled, skipping:", alarm.cameraId);
    return;
  }

  const videoRequest: VideoRequest = {
    workflowId: `wf-${Date.now()}`,
    cameraId: camera.cameraId,
    cameraType: camera.cameraType,
    videoConfig: camera.videoConfig,
    detectionConfigs: camera.detectionConfigs,
  };

  try {
    const videoUrl = await videoFetcher.fetchVideo(
      camera.hardwareId,
      camera.videoConfig.preAlarmSeconds,
      camera.videoConfig.postAlarmSeconds
    );

    await fetch(`${process.env.PRIMARY_API_URL || "http://localhost:8000"}/api/process-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camera_id: camera.cameraId,
        video_url: videoUrl,
        camera_type: camera.cameraType,
        detection_configs: camera.detectionConfigs,
      }),
    });

    console.log("Video sent to Primary API:", videoRequest.workflowId);
  } catch (error) {
    console.error("Failed to send video:", error);
  }
}

function inferCameraType(name: string): "normal" | "thermal" {
  const lower = name.toLowerCase();
  if (lower.includes("thermal") || lower.includes("ir") || lower.includes("infrared")) {
    return "thermal";
  }
  return "normal";
}

async function main() {
  const config = createConfig();

  db = new DatabaseClient(config.database);
  await db.connect();
  await db.initializeSchema();

  videoFetcher = new VideoFetcher({
    proxyPort: config.aiBridge.videoProxyPort,
    transport: config.video.rtspTransport,
  });

  bridge = new MilestoneBridge(config);

  bridge.on("alarm", handleAlarmTriggered);

  bridge.on("error", (error) => {
    console.error("Bridge error:", error);
  });

  const syncOnStartup = process.env.SYNC_CAMERAS_ON_STARTUP === "true";
  if (syncOnStartup) {
    try {
      const vmsCameras = await bridge.getCamerasFromVms();
      for (const vmsCam of vmsCameras) {
        const existing = await db.getCamera(vmsCam.cameraId);
        if (!existing) {
          const newCamera: Camera = {
            cameraId: vmsCam.cameraId,
            name: vmsCam.name,
            enabled: true,
            hardwareId: vmsCam.hardwareId,
            cameraType: inferCameraType(vmsCam.name),
            status: vmsCam.status,
            videoConfig: {
              preAlarmSeconds: config.video.defaultPreAlarmSeconds,
              postAlarmSeconds: config.video.defaultPostAlarmSeconds,
            },
            detectionConfigs: [
              { detectionType: "person", enabled: true },
              { detectionType: "vehicle", enabled: true },
              { detectionType: "license_plate", enabled: true },
            ],
          };
          await db.saveCamera(newCamera);
        }
      }
      console.log("Synced cameras on startup");
    } catch (error) {
      console.error("Failed to sync cameras on startup:", error);
    }
  }

  const port = parseInt(process.env.VMS_BRIDGE_PORT || "8001");
  app.listen(port, () => {
    console.log(`VMS Bridge listening on port ${port}`);
  });
}

main().catch(console.error);