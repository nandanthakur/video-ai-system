import { MilestoneBridge } from "../src/milestone-bridge";
import { MilestoneConfig } from "../src/types";

describe("MilestoneBridge", () => {
  const mockConfig: MilestoneConfig = {
    vms: {
      type: "milestone",
      host: "localhost",
      port: 443,
      username: "admin",
      password: "test",
    },
    aiBridge: {
      host: "localhost",
      port: 4000,
      graphqlEndpoint: "http://localhost:4000/api/bridge/graphql",
      videoProxyPort: 8787,
      healthPort: 3500,
    },
    processing: {
      pollIntervalSeconds: 10,
      cameraFilter: [],
      alarmTriggerTypes: ["motion_detection"],
    },
    iva: {
      applicationId: "test-app",
      applicationName: "Test App",
      topics: [{ name: "person_detection", enabled: true }],
    },
    video: {
      rtspTransport: "tcp",
      defaultPreAlarmSeconds: 5,
      defaultPostAlarmSeconds: 5,
      maxFramerate: 5,
      resolution: { width: 1280, height: 720 },
    },
    primaryApi: {
      baseUrl: "http://localhost:8000",
    },
    database: {
      host: "localhost",
      port: 5432,
      database: "video_ai",
      user: "postgres",
      password: "postgres",
    },
  };

  it("should create a bridge instance", () => {
    const bridge = new MilestoneBridge(mockConfig);
    expect(bridge).toBeDefined();
  });

  it("should return registered cameras", () => {
    const bridge = new MilestoneBridge(mockConfig);
    const cameras = bridge.getRegisteredCameras();
    expect(Array.isArray(cameras)).toBe(true);
  });
});