import { inject, runtime, InferenceSession } from "onnxruntime-react-native";
import { Detection } from "./types";

export interface ModelConfig {
  modelPath: string;
  labels: string[];
  confidenceThreshold: number;
  inputWidth: number;
  inputHeight: number;
}

export class OnnxClient {
  private session: InferenceSession | null = null;
  private labels: string[];
  private confidenceThreshold: number;
  private inputWidth: number;
  private inputHeight: number;

  constructor(config: ModelConfig) {
    this.labels = config.labels;
    this.confidenceThreshold = config.confidenceThreshold;
    this.inputWidth = config.inputWidth;
    this.inputHeight = config.inputHeight;
  }

  async loadModel(modelBuffer: ArrayBuffer): Promise<void> {
    await runtime.init();
    this.session = await InferenceSession.create(modelBuffer);
  }

  async detectObjects(imageData: Float32Array): Promise<Detection[]> {
    if (!this.session) {
      throw new Error("Model not loaded");
    }

    const inputTensor = new Float32Array(this.inputWidth * this.inputHeight * 3);

    const feeds: Record<string, Float32Array> = {
      input: imageData,
    };

    const results = await this.session.run(feeds);
    const output = results.output;

    return this.parseOutput(output);
  }

  private parseOutput(output: Float32Array): Detection[] {
    const detections: Detection[] = [];
    const numDetections = output[0];

    for (let i = 0; i < numDetections; i++) {
      const baseIdx = i * 7;
      const classId = output[baseIdx + 1];
      const confidence = output[baseIdx + 2];
      const bbox = [
        output[baseIdx + 3],
        output[baseIdx + 4],
        output[baseIdx + 5],
        output[baseIdx + 6],
      ] as [number, number, number, number];

      if (confidence >= this.confidenceThreshold && classId < this.labels.length) {
        detections.push({
          class: this.labels[classId] as "person" | "vehicle" | "license_plate",
          confidence,
          bbox,
          frameNumber: 0,
        });
      }
    }

    return detections;
  }
}

export class ObjectDetector {
  private normalClient: OnnxClient;
  private thermalClient: OnnxClient;

  constructor(
    normalModelPath: string,
    thermalModelPath: string,
    confidenceThreshold: number = 0.5
  ) {
    this.normalClient = new OnnxClient({
      modelPath: normalModelPath,
      labels: ["person", "vehicle", "license_plate"],
      confidenceThreshold,
      inputWidth: 640,
      inputHeight: 640,
    });

    this.thermalClient = new OnnxClient({
      modelPath: thermalModelPath,
      labels: ["person"],
      confidenceThreshold,
      inputWidth: 640,
      inputHeight: 640,
    });
  }

  async loadModels(
    normalModelData: ArrayBuffer,
    thermalModelData: ArrayBuffer
  ): Promise<void> {
    await this.normalClient.loadModel(normalModelData);
    await this.thermalClient.loadModel(thermalModelData);
  }

  async detect(
    frameData: Float32Array,
    cameraType: "normal" | "thermal",
    enabledDetections: string[]
  ): Promise<Detection[]> {
    const client = cameraType === "normal" ? this.normalClient : this.thermalClient;
    const allDetections = await client.detectObjects(frameData);

    return allDetections.filter((d) => enabledDetections.includes(d.class));
  }
}