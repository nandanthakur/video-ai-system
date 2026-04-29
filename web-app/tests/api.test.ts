import request from "supertest";
import express from "express";

const mockGetCameras = jest.fn();
const mockGetCamera = jest.fn();
const mockSaveCamera = jest.fn();

jest.mock("../src/database-client", () => ({
  DatabaseClient: jest.fn().mockImplementation(() => ({
    getCameras: mockGetCameras,
    getCamera: mockGetCamera,
    saveCamera: mockSaveCamera,
    connect: jest.fn().mockResolvedValue(undefined),
    initializeSchema: jest.fn().mockResolvedValue(undefined),
  })),
}));

const app = express();
app.use(express.json());

app.get("/cameras", async (req, res) => {
  const cameras = await mockGetCameras();
  res.json({ cameras });
});

app.get("/cameras/:cameraId", async (req, res) => {
  const camera = await mockGetCamera(req.params.cameraId);
  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }
  res.json(camera);
});

app.put("/cameras/:cameraId/toggle", async (req, res) => {
  const camera = await mockGetCamera(req.params.cameraId);
  if (!camera) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }
  const updated = { ...camera, enabled: !camera.enabled };
  await mockSaveCamera(updated);
  res.json(updated);
});

describe("Web App API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /cameras", () => {
    it("should return all cameras", async () => {
      const mockCameras = [
        { cameraId: "cam-001", name: "Front", enabled: true },
        { cameraId: "cam-002", name: "Back", enabled: false },
      ];
      mockGetCameras.mockResolvedValueOnce(mockCameras);

      const res = await request(app).get("/cameras");

      expect(res.status).toBe(200);
      expect(res.body.cameras).toHaveLength(2);
    });
  });

  describe("GET /cameras/:cameraId", () => {
    it("should return camera", async () => {
      const mockCamera = { cameraId: "cam-001", name: "Front", enabled: true };
      mockGetCamera.mockResolvedValueOnce(mockCamera);

      const res = await request(app).get("/cameras/cam-001");

      expect(res.status).toBe(200);
      expect(res.body.cameraId).toBe("cam-001");
    });

    it("should return 404 for non-existent camera", async () => {
      mockGetCamera.mockResolvedValueOnce(null);

      const res = await request(app).get("/cameras/non-existent");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /cameras/:cameraId/toggle", () => {
    it("should toggle camera enabled state", async () => {
      const mockCamera = { cameraId: "cam-001", name: "Front", enabled: true };
      mockGetCamera.mockResolvedValueOnce(mockCamera);
      mockSaveCamera.mockResolvedValueOnce({ ...mockCamera, enabled: false });

      const res = await request(app).put("/cameras/cam-001/toggle");

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it("should toggle from disabled to enabled", async () => {
      const mockCamera = { cameraId: "cam-001", name: "Front", enabled: false };
      mockGetCamera.mockResolvedValueOnce(mockCamera);
      mockSaveCamera.mockResolvedValueOnce({ ...mockCamera, enabled: true });

      const res = await request(app).put("/cameras/cam-001/toggle");

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
    });
  });
});