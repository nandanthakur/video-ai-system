import { AlarmDecider, AlarmDecision } from "../src/alarm-decider";
import { Camera } from "../src/types";

describe("AlarmDecider", () => {
  let decider: AlarmDecider;

  beforeEach(() => {
    decider = new AlarmDecider();
  });

  describe("decide", () => {
    const baseDetection = {
      person: { detected: false, confidence: 0 },
      vehicle: { detected: false, confidence: 0 },
      movement: { detected: false, confidence: 0 },
      licensePlate: { detected: false, confidence: 0 },
    };

    it("should return OPEN when person detected", () => {
      const detections = {
        ...baseDetection,
        person: { detected: true, confidence: 0.9 },
      };

      const decision = decider.decide(detections, "normal");

      expect(decision.alarmState).toBe("OPEN");
      expect(decision.reason).toContain("person");
    });

    it("should return OPEN when vehicle detected and moving", () => {
      const detections = {
        ...baseDetection,
        vehicle: { detected: true, confidence: 0.85 },
        movement: { detected: true, confidence: 0.8 },
      };

      const decision = decider.decide(detections, "normal");

      expect(decision.alarmState).toBe("OPEN");
      expect(decision.reason).toContain("vehicle");
    });

    it("should return CLOSED when no detections", () => {
      const decision = decider.decide(baseDetection, "normal");

      expect(decision.alarmState).toBe("CLOSED");
      expect(decision.reason).toContain("no");
    });

    it("should return CLOSED when only vehicle detected without movement", () => {
      const detections = {
        ...baseDetection,
        vehicle: { detected: true, confidence: 0.85 },
        movement: { detected: false, confidence: 0 },
      };

      const decision = decider.decide(detections, "normal");

      expect(decision.alarmState).toBe("CLOSED");
    });

    it("should return OPEN when license plate detected", () => {
      const detections = {
        ...baseDetection,
        licensePlate: { detected: true, confidence: 0.9 },
      };

      const decision = decider.decide(detections, "normal");

      expect(decision.alarmState).toBe("OPEN");
      expect(decision.reason).toContain("license plate");
    });

    it("should use thermal rules for thermal camera", () => {
      const detections = {
        ...baseDetection,
        person: { detected: true, confidence: 0.9 },
      };

      const decision = decider.decide(detections, "thermal");

      expect(decision.alarmState).toBe("OPEN");
      expect(decision.reason).toContain("person");
    });

    it("should ignore vehicle for thermal camera", () => {
      const detections = {
        ...baseDetection,
        vehicle: { detected: true, confidence: 0.85 },
        movement: { detected: true, confidence: 0.8 },
      };

      const decision = decider.decide(detections, "thermal");

      expect(decision.alarmState).toBe("CLOSED");
    });
  });

  describe("confidence thresholds", () => {
    it("should ignore low confidence detections", () => {
      const detections = {
        person: { detected: true, confidence: 0.4 },
        vehicle: { detected: false, confidence: 0 },
        movement: { detected: false, confidence: 0 },
        licensePlate: { detected: false, confidence: 0 },
      };

      const decision = decider.decide(detections, "normal");

      expect(decision.alarmState).toBe("CLOSED");
    });

    it("should use default threshold when not specified", () => {
      const deciderDefault = new AlarmDecider(0.5);
      const detections = {
        person: { detected: true, confidence: 0.5 },
        vehicle: { detected: false, confidence: 0 },
        movement: { detected: false, confidence: 0 },
        licensePlate: { detected: false, confidence: 0 },
      };

      const decision = deciderDefault.decide(detections, "normal");

      expect(decision.alarmState).toBe("OPEN");
    });
  });
});

describe("Alarm Logic", () => {
  const decider = new AlarmDecider();

  const testCases: Array<{
    name: string;
    detections: {
      person: { detected: boolean; confidence: number };
      vehicle: { detected: boolean; confidence: number };
      movement: { detected: boolean; confidence: number };
      licensePlate: { detected: boolean; confidence: number };
    };
    cameraType: "normal" | "thermal";
    expected: "OPEN" | "CLOSED";
  }> = [
    {
      name: "person detected → OPEN",
      detections: { person: { detected: true, confidence: 0.9 }, vehicle: { detected: false, confidence: 0 }, movement: { detected: false, confidence: 0 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "normal",
      expected: "OPEN",
    },
    {
      name: "vehicle + moving → OPEN",
      detections: { person: { detected: false, confidence: 0 }, vehicle: { detected: true, confidence: 0.85 }, movement: { detected: true, confidence: 0.8 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "normal",
      expected: "OPEN",
    },
    {
      name: "vehicle without movement → CLOSED",
      detections: { person: { detected: false, confidence: 0 }, vehicle: { detected: true, confidence: 0.85 }, movement: { detected: false, confidence: 0 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "normal",
      expected: "CLOSED",
    },
    {
      name: "license plate → OPEN",
      detections: { person: { detected: false, confidence: 0 }, vehicle: { detected: false, confidence: 0 }, movement: { detected: false, confidence: 0 }, licensePlate: { detected: true, confidence: 0.9 } },
      cameraType: "normal",
      expected: "OPEN",
    },
    {
      name: "thermal + person → OPEN",
      detections: { person: { detected: true, confidence: 0.9 }, vehicle: { detected: false, confidence: 0 }, movement: { detected: false, confidence: 0 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "thermal",
      expected: "OPEN",
    },
    {
      name: "thermal + vehicle → CLOSED",
      detections: { person: { detected: false, confidence: 0 }, vehicle: { detected: true, confidence: 0.85 }, movement: { detected: true, confidence: 0.8 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "thermal",
      expected: "CLOSED",
    },
    {
      name: "nothing detected → CLOSED",
      detections: { person: { detected: false, confidence: 0 }, vehicle: { detected: false, confidence: 0 }, movement: { detected: false, confidence: 0 }, licensePlate: { detected: false, confidence: 0 } },
      cameraType: "normal",
      expected: "CLOSED",
    },
  ];

  testCases.forEach(({ name, detections, cameraType, expected }) => {
    it(name, () => {
      const decision = decider.decide(detections, cameraType);
      expect(decision.alarmState).toBe(expected);
    });
  });
});