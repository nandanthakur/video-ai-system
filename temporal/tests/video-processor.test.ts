import { VideoProcessor, ProcessingResult } from "../src/video-processor";
import { VideoRequest } from "../src/types";

describe("VideoProcessor", () => {
  let processor: VideoProcessor;

  beforeEach(() => {
    processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
      confidenceThreshold: 0.5,
    });
  });

  describe("process", () => {
    it("should process video and return detections", async () => {
      const request: VideoRequest = {
        workflowId: "wf-001",
        cameraId: "cam-001",
        cameraType: "normal",
        videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
        detectionConfigs: [
          { detectionType: "person", enabled: true },
          { detectionType: "vehicle", enabled: true },
        ],
      };

      const result = await processor.process(request);

      expect(result.workflowId).toBe("wf-001");
      expect(result.detections).toBeDefined();
    });

    it("should handle thermal camera type", async () => {
      const request: VideoRequest = {
        workflowId: "wf-002",
        cameraId: "cam-002",
        cameraType: "thermal",
        videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
        detectionConfigs: [{ detectionType: "person", enabled: true }],
      };

      const result = await processor.process(request);

      expect(result.workflowId).toBe("wf-002");
    });
  });

  describe("detection configs", () => {
    it("should only run enabled detections", async () => {
      const request: VideoRequest = {
        workflowId: "wf-003",
        cameraId: "cam-003",
        cameraType: "normal",
        videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
        detectionConfigs: [
          { detectionType: "person", enabled: true },
          { detectionType: "vehicle", enabled: false },
          { detectionType: "license_plate", enabled: true },
        ],
      };

      const result = await processor.process(request);

      expect(result.detections.person).toBeDefined();
      expect(result.detections.vehicle).toBeUndefined();
      expect(result.detections.licensePlate).toBeDefined();
    });

    it("should skip all disabled detections", async () => {
      const request: VideoRequest = {
        workflowId: "wf-004",
        cameraId: "cam-004",
        cameraType: "normal",
        videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
        detectionConfigs: [
          { detectionType: "person", enabled: false },
          { detectionType: "vehicle", enabled: false },
        ],
      };

      const result = await processor.process(request);

      expect(result.detections).toEqual({});
    });
  });
});

describe("Detection Types", () => {
  it("should support person detection", async () => {
    const processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
    });

    const request: VideoRequest = {
      workflowId: "wf-005",
      cameraId: "cam-005",
      cameraType: "normal",
      videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
      detectionConfigs: [{ detectionType: "person", enabled: true }],
    };

    const result = await processor.process(request);

    expect(result.detections.person).toBeDefined();
  });

  it("should support vehicle detection", async () => {
    const processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
    });

    const request: VideoRequest = {
      workflowId: "wf-006",
      cameraId: "cam-006",
      cameraType: "normal",
      videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
      detectionConfigs: [{ detectionType: "vehicle", enabled: true }],
    };

    const result = await processor.process(request);

    expect(result.detections.vehicle).toBeDefined();
  });

  it("should support license plate detection", async () => {
    const processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
    });

    const request: VideoRequest = {
      workflowId: "wf-007",
      cameraId: "cam-007",
      cameraType: "normal",
      videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 5 },
      detectionConfigs: [{ detectionType: "license_plate", enabled: true }],
    };

    const result = await processor.process(request);

    expect(result.detections.licensePlate).toBeDefined();
  });
});

describe("Pre/post alarm buffers", () => {
  it("should include pre-alarm video", async () => {
    const processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
    });

    const request: VideoRequest = {
      workflowId: "wf-008",
      cameraId: "cam-008",
      cameraType: "normal",
      videoConfig: { preAlarmSeconds: 10, postAlarmSeconds: 5 },
      detectionConfigs: [{ detectionType: "person", enabled: true }],
    };

    const result = await processor.process(request);

    expect(result.workflowId).toBe("wf-008");
    expect(result.videoStartTime).toBeDefined();
    expect(result.videoEndTime).toBeDefined();
  });

  it("should include post-alarm video", async () => {
    const processor = new VideoProcessor({
      modelPath: "./models/yolov7.onnx",
    });

    const request: VideoRequest = {
      workflowId: "wf-009",
      cameraId: "cam-009",
      cameraType: "normal",
      videoConfig: { preAlarmSeconds: 5, postAlarmSeconds: 10 },
      detectionConfigs: [{ detectionType: "person", enabled: true }],
    };

    const result = await processor.process(request);

    expect(result.workflowId).toBe("wf-009");
  });
});