import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Detection, LicensePlateResult, MovementResult, WorkflowResult } from "./types";
import { ObjectDetector } from "./onnx-client";
import { MovementDetector } from "./movement-detector";
import { LicensePlateDetector } from "./license-plate-detector";
import { AlarmDecider } from "./alarm-decider";

export class VideoProcessor {
  private ffmpeg: ReturnType<typeof createFFmpeg>;
  private objectDetector: ObjectDetector;
  private movementDetector: MovementDetector;
  private licensePlateDetector: LicensePlateDetector;
  private alarmDecider: AlarmDecider;

  constructor(
    objectDetector: ObjectDetector,
    licensePlateDetector: LicensePlateDetector
  ) {
    this.ffmpeg = createFFmpeg({ log: true });
    this.objectDetector = objectDetector;
    this.movementDetector = new MovementDetector();
    this.licensePlateDetector = licensePlateDetector;
    this.alarmDecider = new AlarmDecider();
  }

  async init(): Promise<void> {
    if (!this.ffmpeg.isLoaded()) {
      this.ffmpeg.load();
    }
  }

  async process(
    videoUrl: string,
    workflowId: string,
    cameraType: "normal" | "thermal",
    enabledDetectionTypes: string[]
  ): Promise<WorkflowResult> {
    const frames = await this.extractFrames(videoUrl);
    const allDetections: Detection[] = [];
    const allMovements: MovementResult[] = [];
    const allLicensePlates: LicensePlateResult[] = [];

    for (const frame of frames) {
      const detections = await this.objectDetector.detect(
        frame.data,
        cameraType,
        enabledDetectionTypes
      );

      detections.forEach((d, i) => {
        allDetections.push({ ...d, frameNumber: frame.frameNumber });
      });

      if (enabledDetectionTypes.includes("vehicle")) {
        const movements = this.movementDetector.calculateMovements(detections);
        allMovements.push(...movements);
      }

      if (
        cameraType === "normal" &&
        enabledDetectionTypes.includes("license_plate")
      ) {
        const plates = await this.licensePlateDetector.detectLicensePlates(
          frame.imageBuffer,
          detections
        );
        allLicensePlates.push(...plates);
      }
    }

    const detectionConfigs = enabledDetectionTypes.map((t) => ({
      detectionType: t,
      enabled: true,
    }));

    const alarmDecision = await this.alarmDecider.decide(
      allDetections,
      allMovements,
      cameraType,
      detectionConfigs
    );

    return {
      workflowId,
      cameraId: "",
      videoName: videoUrl.split("/").pop() || "",
      frames: frames.map((f) => ({
        frameNumber: f.frameNumber,
        detections: allDetections.filter((d) => d.frameNumber === f.frameNumber),
        movements: allMovements,
        licensePlates: allLicensePlates,
      })),
      alarmDecision,
      processedAt: new Date().toISOString(),
    };
  }

  private async extractFrames(
    videoUrl: string
  ): Promise<Array<{ frameNumber: number; data: Float32Array; imageBuffer: Buffer }>> {
    const videoData = await fetchFile(videoUrl);
    this.ffmpeg.FS("writeFile", "input.mp4", videoData);

    await this.ffmpeg.run(
      "-i",
      "input.mp4",
      "-vf",
      "fps=1",
      "-s",
      "640x640",
      "frame_%d.png"
    );

    const frames: Array<{
      frameNumber: number;
      data: Float32Array;
      imageBuffer: Buffer;
    }> = [];
    let frameNum = 1;

    while (true) {
      try {
        const frameName = `frame_${frameNum}.png`;
        const frameData = this.ffmpeg.FS("readFile", frameName);

        if (frameData.length === 0) break;

        const imageBuffer = Buffer.from(frameData);
        const inputData = await this.preprocessImage(imageBuffer);

        frames.push({
          frameNumber: frameNum,
          data: inputData,
          imageBuffer,
        });

        this.ffmpeg.FS("unlink", frameName);
        frameNum++;
      } catch {
        break;
      }
    }

    this.ffmpeg.FS("unlink", "input.mp4");
    return frames;
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
    const width = 640;
    const height = 640;
    const data = new Float32Array(width * height * 3);

    return new Promise((resolve) => {
      resolve(data);
    });
  }

  async terminate(): Promise<void> {
    this.ffmpeg.exit();
  }
}