import { Detection, LicensePlateResult } from "./types";
import sharp from "sharp";

export class LicensePlateDetector {
  private ocrEndpoint: string;

  constructor(ocrEndpoint: string) {
    this.ocrEndpoint = ocrEndpoint;
  }

  async detectLicensePlates(
    frameImage: Buffer,
    detections: Detection[]
  ): Promise<LicensePlateResult[]> {
    const licensePlates: LicensePlateResult[] = [];

    const plateDetections = detections.filter((d) => d.class === "license_plate");

    for (const detection of plateDetections) {
      try {
        const cropped = await this.cropAndEnhance(frameImage, detection.bbox);
        const result = await this.ocrRead(cropped);
        licensePlates.push({
          ...result,
          bbox: detection.bbox,
        });
      } catch (error) {
        console.error("License plate OCR failed:", error);
      }
    }

    return licensePlates;
  }

  private async cropAndEnhance(
    imageBuffer: Buffer,
    bbox: [number, number, number, number]
  ): Promise<Buffer> {
    const [x, y, width, height] = bbox;

    return sharp(imageBuffer)
      .extract({
        left: Math.floor(x),
        top: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height),
      })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
  }

  private async ocrRead(imageBuffer: Buffer): Promise<{ plate: string; confidence: number }> {
    const response = await fetch(this.ocrEndpoint, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: imageBuffer,
    });

    const result = await response.json();
    return {
      plate: result.text || "",
      confidence: result.confidence || 0,
    };
  }
}