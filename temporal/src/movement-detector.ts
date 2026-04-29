import { Detection, MovementResult } from "./types";

export class MovementDetector {
  private minFramesForMovement: number;
  private movementThreshold: number;

  constructor(minFramesForMovement: number = 3, movementThreshold: number = 5.0) {
    this.minFramesForMovement = minFramesForMovement;
    this.movementThreshold = movementThreshold;
  }

  calculateMovements(detections: Detection[]): MovementResult[] {
    const objectTracks = this.groupByObject(detections);
    const movements: MovementResult[] = [];

    for (const [objectId, frames] of objectTracks) {
      if (frames.length < 2) {
        movements.push({
          objectId,
          moving: false,
          direction: [0, 0],
          speed: 0,
        });
        continue;
      }

      const movement = this.calculateMovement(frames);
      movements.push(movement);
    }

    return movements;
  }

  private groupByObject(
    detections: Detection[]
  ): Map<string, Array<{ frameNumber: number; bbox: number[] }>> {
    const tracks = new Map<string, Array<{ frameNumber: number; bbox: number[] }>>();

    for (let i = 0; i < detections.length; i++) {
      const det = detections[i];
      const key = `${det.class}-${Math.floor(det.bbox[0] / 100)}-${Math.floor(det.bbox[1] / 100)}`;

      if (!tracks.has(key)) {
        tracks.set(key, []);
      }
      tracks.get(key)!.push({
        frameNumber: det.frameNumber,
        bbox: det.bbox,
      });
    }

    return tracks;
  }

  private calculateMovement(
    frames: Array<{ frameNumber: number; bbox: number[] }>
  ): MovementResult {
    const sortedFrames = frames.sort((a, b) => a.frameNumber - b.frameNumber);
    const centroids = sortedFrames.map((f) => this.getCentroid(f.bbox));

    let totalDx = 0;
    let totalDy = 0;

    for (let i = 1; i < centroids.length; i++) {
      totalDx += centroids[i].x - centroids[i - 1].x;
      totalDy += centroids[i].y - centroids[i - 1].y;
    }

    const avgDx = totalDx / (centroids.length - 1);
    const avgDy = totalDy / (centroids.length - 1);
    const speed = Math.sqrt(avgDx * avgDx + avgDy * avgDy);

    const direction: [number, number] = speed > 0 ? [avgDx / speed, avgDy / speed] : [0, 0];

    return {
      objectId: frames[0].bbox.join("-"),
      moving: speed > this.movementThreshold,
      direction,
      speed,
    };
  }

  private getCentroid(bbox: number[]): { x: number; y: number } {
    return {
      x: bbox[0] + bbox[2] / 2,
      y: bbox[1] + bbox[3] / 2,
    };
  }
}