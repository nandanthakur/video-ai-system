import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import request from "supertest";

const app = express();
app.use(express.json());

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

const workflows = new Map<string, WorkflowRecord>();

app.get("/health", (_req, res: Response) => {
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

    const workflow: WorkflowRecord = {
      workflowId,
      cameraId: camera_id,
      videoUrl: video_url,
      cameraType: camera_type,
      status: "accepted",
      createdAt: new Date().toISOString(),
    };
    workflows.set(workflowId, workflow);

    res.json({
      workflow_id: workflowId,
      status: "accepted",
      video_url: video_url,
    });
  } catch (error) {
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

export default app;

describe("Primary API", () => {
  beforeEach(() => {
    workflows.clear();
  });

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("POST /token", () => {
    it("should return token with valid credentials", async () => {
      const res = await request(app)
        .post("/token")
        .send({ username: "admin", password: "admin123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe("mock-jwt-token");
      expect(res.body.expires_in).toBe(3600);
    });

    it("should return 401 with invalid credentials", async () => {
      const res = await request(app)
        .post("/token")
        .send({ username: "admin", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    it("should return 401 with missing credentials", async () => {
      const res = await request(app).post("/token").send({});

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/process-video", () => {
    it("should reject request without camera_id", async () => {
      const res = await request(app)
        .post("/api/process-video")
        .send({ video_url: "http://example.com/video.mp4" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("camera_id and video_url required");
    });

    it("should reject request without video_url", async () => {
      const res = await request(app)
        .post("/api/process-video")
        .send({ camera_id: "cam-001" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("camera_id and video_url required");
    });

    it("should accept valid request", async () => {
      const res = await request(app)
        .post("/api/process-video")
        .send({
          camera_id: "cam-001",
          video_url: "http://example.com/video.mp4",
        });

      expect(res.status).toBe(200);
      expect(res.body.workflow_id).toBeDefined();
      expect(res.body.status).toBe("accepted");
    });

    it("should accept request with custom camera_type", async () => {
      const res = await request(app)
        .post("/api/process-video")
        .send({
          camera_id: "cam-001",
          video_url: "http://example.com/video.mp4",
          camera_type: "thermal",
        });

      expect(res.status).toBe(200);
    });

    it("should accept request with custom detection_configs", async () => {
      const detectionConfigs = [
        { detection_type: "person", enabled: true },
      ];

      const res = await request(app)
        .post("/api/process-video")
        .send({
          camera_id: "cam-001",
          video_url: "http://example.com/video.mp4",
          detection_configs: detectionConfigs,
        });

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/workflow/:workflowId", () => {
    it("should return 404 for non-existent workflow", async () => {
      const res = await request(app).get("/api/workflow/non-existent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Workflow not found");
    });
  });
});

describe("Authentication", () => {
  const app = express();
  app.use(express.json());

  app.post("/token", (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
      res.json({ token: "jwt-token", expires_in: 3600 });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  it("should accept default admin credentials", async () => {
    const res = await request(app)
      .post("/token")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
  });
});