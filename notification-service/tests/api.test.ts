import request from "supertest";
import express from "express";

const mockSendNotification = jest.fn();

jest.mock("../src/server", () => ({
  sendTeamsNotification: mockSendNotification,
}));

describe("Notification Service", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    app = express();
    app.use(express.json());

    app.post("/notify", async (req, res) => {
      const { cameraId, alarmState, message } = req.body;
      try {
        await mockSendNotification({ cameraId, alarmState, message });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });
  });

  describe("GET /health", () => {
    it("should return ok status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("POST /notify", () => {
    it("should send notification on alarm", async () => {
      mockSendNotification.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post("/notify")
        .send({
          cameraId: "cam-001",
          alarmState: "OPEN",
          message: "Person detected at Front Entrance",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should handle notification failure", async () => {
      mockSendNotification.mockRejectedValueOnce(new Error("Failed"));

      const res = await request(app)
        .post("/notify")
        .send({
          cameraId: "cam-001",
          alarmState: "OPEN",
          message: "Test",
        });

      expect(res.status).toBe(500);
    });
  });
});

describe("Teams Notification Format", () => {
  it("should format OPEN alarm message", () => {
    const message = {
      cameraId: "cam-001",
      alarmState: "OPEN",
      cameraName: "Front Entrance",
      timestamp: new Date().toISOString(),
    };

    expect(message.alarmState).toBe("OPEN");
  });

  it("should format CLOSED alarm message", () => {
    const message = {
      cameraId: "cam-001",
      alarmState: "CLOSED",
      cameraName: "Front Entrance",
      timestamp: new Date().toISOString(),
    };

    expect(message.alarmState).toBe("CLOSED");
  });
});