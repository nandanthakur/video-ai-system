import express, { Request, Response } from "express";
import session from "express-session";
import { DatabaseClient } from "./database-client";
import { CameraService } from "./camera-service";
import { Camera, WebAppConfig, User } from "./types";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "video-ai-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 3600000 },
  })
);

let db: DatabaseClient;
let cameraService: CameraService;
const authenticatedUsers = new Map<string, User>();

function createConfig(): WebAppConfig {
  return {
    server: {
      port: parseInt(process.env.WEB_APP_PORT || "8005"),
      sessionSecret: process.env.SESSION_SECRET || "video-ai-secret",
    },
    database: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "video_ai",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
    },
    vmsBridge: {
      baseUrl: process.env.VMS_BRIDGE_URL || "http://localhost:8001",
    },
    primaryApi: {
      baseUrl: process.env.PRIMARY_API_URL || "http://localhost:8000",
    },
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(join(__dirname, "public", "login.html"));
});

app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const user = await db.authenticateUser(username, password);
    if (user) {
      authenticatedUsers.set(req.sessionID, user);
      res.json({ success: true, redirect: "/" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/logout", (req: Request, res: Response) => {
  authenticatedUsers.delete(req.sessionID);
  res.json({ success: true });
});

function requireAuth(
  req: Request,
  res: Response,
  next: () => void
): void {
  const user = authenticatedUsers.get(req.sessionID);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/api/cameras", requireAuth, async (_req, res) => {
  try {
    const cameras = await cameraService.getCameras();
    res.json({ cameras });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post(
  "/api/cameras/sync",
  requireAuth,
  async (_req, res) => {
    try {
      const cameras = await cameraService.syncCamerasFromVmsBridge();
      res.json({ success: true, cameras });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  }
);

app.get("/api/cameras/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const camera = await cameraService.getCamera(req.params.id);
    if (!camera) {
      res.status(404).json({ error: "Camera not found" });
      return;
    }
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.put("/api/cameras/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const camera: Camera = {
      ...req.body,
      id: req.params.id,
    };
    await cameraService.updateCamera(camera);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.delete(
  "/api/cameras/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      await cameraService.deleteCamera(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  }
);

async function main() {
  const config = createConfig();

  db = new DatabaseClient(config.database);
  await db.connect();
  await db.initializeSchema();

  cameraService = new CameraService(db, config.vmsBridge.baseUrl);

  app.use(express.static(join(__dirname, "public")));

  app.listen(config.server.port, () => {
    console.log(`Web App listening on port ${config.server.port}`);
  });
}

main().catch(console.error);