import { Detection, LicensePlateResult, MovementResult, AlarmDecision } from "./types";

export class AlarmDecider {
  async decide(
    detections: Detection[],
    movements: MovementResult[],
    cameraType: "normal" | "thermal",
    detectionConfigs: Array<{ detectionType: string; enabled: boolean }>
  ): Promise<AlarmDecision> {
    const enabledTypes = detectionConfigs
      .filter((c) => c.enabled)
      .map((c) => c.detectionType);

    const personDetected = detections.some(
      (d) => d.class === "person" && enabledTypes.includes("person")
    );
    const vehicleDetected = detections.some(
      (d) => d.class === "vehicle" && enabledTypes.includes("vehicle")
    );
    const vehicleMovements = movements.filter((m) => m.moving);
    const licensePlates: LicensePlateResult[] = [];

    if (personDetected) {
      return {
        alarmState: "OPEN",
        reason: "Person detected",
        detections,
        movements,
        licensePlates,
      };
    }

    if (vehicleDetected) {
      const movingVehicle = vehicleMovements.find(
        (m) =>
          detections.find(
            (d) => d.class === "vehicle" && this.bboxMatches(d.bbox, m.objectId.split("-").map(Number))
          )?.class === "vehicle"
      );

      if (movingVehicle?.moving) {
        return {
          alarmState: "OPEN",
          reason: "Moving vehicle detected",
          detections,
          movements,
          licensePlates,
        };
      }

      return {
        alarmState: "CLOSED",
        reason: "Vehicle detected but not moving",
        detections,
        movements,
        licensePlates,
      };
    }

    return {
      alarmState: "CLOSED",
      reason: "No detections",
      detections,
      movements,
      licensePlates,
    };
  }

  private bboxMatches(
    bbox1: [number, number, number, number],
    bbox2: [number, number, number, number]
  ): boolean {
    const center1 = { x: bbox1[0] + bbox1[2] / 2, y: bbox1[1] + bbox1[3] / 2 };
    const center2 = { x: bbox2[0] + bbox2[2] / 2, y: bbox2[1] + bbox2[3] / 2 };

    const distance = Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );

    return distance < 50;
  }
}