import { DatabaseClient } from "../src/database-client";
import { Camera } from "../src/types";

const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.mock("pg", () => ({
  Client: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
}));

describe("DatabaseClient", () => {
  let db: DatabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    db = new DatabaseClient({
      host: "localhost",
      port: 5432,
      database: "video_ai",
      user: "postgres",
      password: "postgres",
    });
  });

  describe("connect", () => {
    it("should connect to database", async () => {
      await db.connect();
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should disconnect from database", async () => {
      await db.disconnect();
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe("getCameras", () => {
    it("should return all cameras", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            camera_id: "cam-001",
            name: "Front Entrance",
            camera_type: "normal",
            hardware_id: "hw-001",
            status: "active",
            detection_configs: '[{"detectionType":"person","enabled":true}]',
            video_config: '{"preAlarmSeconds":5,"postAlarmSeconds":5}',
            enabled: true,
          },
        ],
      });

      const cameras = await db.getCameras();

      expect(cameras).toHaveLength(1);
      expect(cameras[0].cameraId).toBe("cam-001");
      expect(cameras[0].name).toBe("Front Entrance");
      expect(cameras[0].cameraType).toBe("normal");
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM cameras ORDER BY name"
      );
    });

    it("should return empty array when no cameras", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const cameras = await db.getCameras();

      expect(cameras).toHaveLength(0);
    });
  });

  describe("getCamera", () => {
    it("should return camera by id", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            camera_id: "cam-001",
            name: "Front Entrance",
            camera_type: "normal",
            hardware_id: "hw-001",
            status: "active",
            detection_configs: '[{"detectionType":"person","enabled":true}]',
            video_config: '{"preAlarmSeconds":5,"postAlarmSeconds":5}',
            enabled: true,
          },
        ],
      });

      const camera = await db.getCamera("cam-001");

      expect(camera).not.toBeNull();
      expect(camera?.cameraId).toBe("cam-001");
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM cameras WHERE camera_id = $1",
        ["cam-001"]
      );
    });

    it("should return null when camera not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const camera = await db.getCamera("non-existent");

      expect(camera).toBeNull();
    });
  });

  describe("getEnabledCameras", () => {
    it("should return only enabled cameras", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            camera_id: "cam-001",
            name: "Front Entrance",
            camera_type: "normal",
            hardware_id: "hw-001",
            status: "active",
            detection_configs: '[{"detectionType":"person","enabled":true}]',
            video_config: '{"preAlarmSeconds":5,"postAlarmSeconds":5}',
            enabled: true,
          },
        ],
      });

      const cameras = await db.getEnabledCameras();

      expect(cameras).toHaveLength(1);
      expect(cameras[0].enabled).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM cameras WHERE enabled = TRUE ORDER BY name"
      );
    });
  });

  describe("saveCamera", () => {
    const testCamera: Camera = {
      cameraId: "cam-001",
      name: "Front Entrance",
      enabled: true,
      hardwareId: "hw-001",
      cameraType: "normal",
      status: "active",
      videoConfig: {
        preAlarmSeconds: 5,
        postAlarmSeconds: 5,
      },
      detectionConfigs: [
        { detectionType: "person", enabled: true },
        { detectionType: "vehicle", enabled: true },
      ],
    };

    it("should insert new camera", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ affectedRows: 1 }] });

      const result = await db.saveCamera(testCamera);

      expect(result.cameraId).toBe("cam-001");
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO cameras"),
        expect.arrayContaining([expect.anything()])
      );
    });

    it("should update existing camera", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          camera_id: testCamera.cameraId,
          name: testCamera.name,
          enabled: true,
          camera_type: testCamera.cameraType,
          hardware_id: testCamera.hardwareId,
          detection_configs: JSON.stringify(testCamera.detectionConfigs),
          video_config: JSON.stringify(testCamera.videoConfig),
          status: testCamera.status,
        }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ affectedRows: 1 }] });

      const result = await db.saveCamera(testCamera);

      expect(result.cameraId).toBe("cam-001");
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE cameras"),
        expect.arrayContaining([expect.anything()])
      );
    });
  });

  describe("deleteCamera", () => {
    it("should delete camera", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await db.deleteCamera("cam-001");

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM cameras WHERE camera_id = $1",
        ["cam-001"]
      );
    });
  });

  describe("initializeSchema", () => {
    it("should create cameras table", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await db.initializeSchema();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS cameras")
      );
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("enabled"));
    });
  });
});

describe("Camera Type Guards", () => {
  it("should have enabled field in Camera interface", () => {
    const camera: Camera = {
      cameraId: "test",
      name: "Test",
      enabled: false,
      hardwareId: "hw-1",
      cameraType: "normal",
      status: "active",
      videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
      detectionConfigs: [],
    };

    expect(camera.enabled).toBe(false);
  });
});