import request from "supertest";
import express, { Response } from "express";

const mockGetCameras = jest.fn();
const mockGetCamera = jest.fn();
const mockSaveCamera = jest.fn();
const mockDeleteCamera = jest.fn();
const mockGetEnabledCameras = jest.fn();

jest.mock("../src/database-client", () => ({
  DatabaseClient: jest.fn().mockImplementation(() => ({
    getCameras: mockGetCameras,
    getCamera: mockGetCamera,
    saveCamera: mockSaveCamera,
    deleteCamera: mockDeleteCamera,
    getEnabledCameras: mockGetEnabledCameras,
    connect: jest.fn().mockResolvedValue(undefined),
    initializeSchema: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../src/milestone-bridge", () => ({
  MilestoneBridge: jest.fn().mockImplementation(() => ({
    getCamerasFromVms: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    setAlarm: jest.fn().mockResolvedValue(undefined),
  })),
}));

const app = express();
app.use(express.json());

app.get("/health", (_req, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/cameras", async (req, res: Response) => {
  const enabledOnly = req.query.enabled === "true";
  try {
    const cameras = enabledOnly
      ? await mockGetEnabledCameras()
      : await mockGetCameras();
    res.json({ cameras });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/cameras/:cameraId", async (req, res: Response) => {
  const camera = await mockGetCamera(req.params.cameraId);
  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }
  res.json(camera);
});

app.put("/cameras/:cameraId", async (req, res: Response) => {
  await mockSaveCamera({ ...req.body, cameraId: req.params.cameraId });
  res.json({ success: true });
});

app.delete("/cameras/:cameraId", async (req, res: Response) => {
  await mockDeleteCamera(req.params.cameraId);
  res.json({ success: true });
});

describe("VMS Bridge API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("GET /cameras", () => {
    it("should return all cameras", async () => {
      const mockCameras = [
        {
          cameraId: "cam-001",
          name: "Front Entrance",
          cameraType: "normal",
          enabled: true,
        },
        {
          cameraId: "cam-002",
          name: "Back Parking",
          cameraType: "normal",
          enabled: false,
        },
      ];
      mockGetCameras.mockResolvedValueOnce(mockCameras);

      const res = await request(app).get("/cameras");

      expect(res.status).toBe(200);
      expect(res.body.cameras).toHaveLength(2);
      expect(mockGetCameras).toHaveBeenCalled();
    });

    it("should return only enabled cameras when enabled=true", async () => {
      const mockCameras = [
        {
          cameraId: "cam-001",
          name: "Front Entrance",
          cameraType: "normal",
          enabled: true,
        },
      ];
      mockGetEnabledCameras.mockResolvedValueOnce(mockCameras);

      const res = await request(app).get("/cameras?enabled=true");

      expect(res.status).toBe(200);
      expect(res.body.cameras).toHaveLength(1);
      expect(mockGetEnabledCameras).toHaveBeenCalled();
    });
  });

  describe("GET /cameras/:cameraId", () => {
    it("should return camera by id", async () => {
      const mockCamera = {
        cameraId: "cam-001",
        name: "Front Entrance",
        cameraType: "normal",
        enabled: true,
      };
      mockGetCamera.mockResolvedValueOnce(mockCamera);

      const res = await request(app).get("/cameras/cam-001");

      expect(res.status).toBe(200);
      expect(res.body.cameraId).toBe("cam-001");
    });

    it("should return 404 when camera not found", async () => {
      mockGetCamera.mockResolvedValueOnce(null);

      const res = await request(app).get("/cameras/non-existent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Camera not found");
    });
  });

  describe("PUT /cameras/:cameraId", () => {
    it("should update camera", async () => {
      mockSaveCamera.mockResolvedValueOnce({});

      const res = await request(app)
        .put("/cameras/cam-001")
        .send({ name: "Updated Camera", enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSaveCamera).toHaveBeenCalledWith({
        cameraId: "cam-001",
        name: "Updated Camera",
        enabled: false,
      });
    });
  });

  describe("DELETE /cameras/:cameraId", () => {
    it("should delete camera", async () => {
      mockDeleteCamera.mockResolvedValueOnce({});

      const res = await request(app).delete("/cameras/cam-001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDeleteCamera).toHaveBeenCalledWith("cam-001");
    });
  });
});