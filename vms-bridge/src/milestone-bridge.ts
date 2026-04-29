import { EventEmitter } from "events";
import { GraphQLClient, gql } from "./graphql-client";
import { MilestoneConfig, VmsCamera, AlarmEvent } from "./types";
import { VideoStreamHandler } from "./video-stream";

interface GraphQLResult {
  cameras?: VmsCamera[];
  registerIVAApplication?: { id: string; name: string; status: string };
  subscribeCameraToTopics?: { success: boolean };
  setAlarm?: { success: boolean };
  analyticsEvents?: AlarmEvent[];
}

export class MilestoneBridge extends EventEmitter {
  private config: MilestoneConfig;
  private graphql: GraphQLClient;
  private videoHandler: VideoStreamHandler;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private registeredCameras = new Map<string, string[]>();
  private alarmStates = new Map<string, "OPEN" | "CLOSED">();

  constructor(config: MilestoneConfig) {
    super();
    this.config = config;
    this.graphql = new GraphQLClient(config.aiBridge.graphqlEndpoint);
    this.videoHandler = new VideoStreamHandler({
      proxyPort: config.aiBridge.videoProxyPort,
      transport: config.video.rtspTransport,
    });
  }

  async start(): Promise<void> {
    await this.registerIVAApplication();
    await this.subscribeCameras();
    this.startPolling();
    this.emit("started");
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.videoHandler.disconnectAll();
    this.emit("stopped");
  }

  async getCamerasFromVms(): Promise<VmsCamera[]> {
    const query = gql`
      query GetCameras {
        cameras {
          cameraId
          name
          hardwareId
          status
        }
      }
    `;

    try {
      const result = await this.graphql.query<GraphQLResult>(query);
      return result.cameras || [];
    } catch (error) {
      console.error("Failed to get cameras from VMS:", error);
      return [];
    }
  }

  async setAlarm(cameraId: string, alarmState: "OPEN" | "CLOSED", reason: string): Promise<void> {
    const mutation = gql`
      mutation SetAlarm($input: SetAlarmInput!) {
        setAlarm(input: $input) {
          success
        }
      }
    `;

    try {
      await this.graphql.mutate<GraphQLResult>(mutation, {
        input: {
          cameraId,
          alarmState,
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      this.alarmStates.set(cameraId, alarmState);
      console.log(`Alarm set to ${alarmState} for camera ${cameraId}: ${reason}`);
    } catch (error) {
      console.error("Failed to set alarm:", error);
    }
  }

  getAlarmState(cameraId: string): "OPEN" | "CLOSED" | undefined {
    return this.alarmStates.get(cameraId);
  }

  private async registerIVAApplication(): Promise<void> {
    const mutation = gql`
      mutation Register($input: RegisterIVAApplicationInput!) {
        registerIVAApplication(input: $input) {
          id
          name
          status
        }
      }
    `;

    const result = await this.graphql.mutate<GraphQLResult>(mutation, {
      input: {
        id: this.config.iva.applicationId,
        name: this.config.iva.applicationName,
        topics: this.config.iva.topics.map((t) => ({
          name: t.name,
          enabled: t.enabled,
        })),
        callbackUrl: `http://vms-bridge:8001/callback`,
      },
    });

    this.emit("registered", result.registerIVAApplication);
  }

  private async subscribeCameras(): Promise<void> {
    const query = gql`
      query GetCameras {
        cameras {
          cameraId
          name
          hardwareId
          status
        }
      }
    `;

    const result = await this.graphql.query<GraphQLResult>(query);
    const cameras = result.cameras || [];

    const filter = this.config.processing.cameraFilter;
    const filteredCameras = filter.length > 0
      ? cameras.filter((c: VmsCamera) => filter.includes(c.cameraId))
      : cameras;

    for (const camera of filteredCameras) {
      const topicNames = this.config.iva.topics
        .filter((t) => t.enabled)
        .map((t) => t.name);

      await this.subscribeCameraToTopics(camera.cameraId, topicNames);
      this.registeredCameras.set(camera.cameraId, topicNames);
      this.emit("subscribed", camera.cameraId);
    }
  }

  private async subscribeCameraToTopics(
    cameraId: string,
    topicNames: string[]
  ): Promise<void> {
    const mutation = gql`
      mutation Subscribe($cameraId: ID!, $topicNames: [String!]!) {
        subscribeCameraToTopics(
          cameraId: $cameraId
          topicNames: $topicNames
        ) {
          success
        }
      }
    `;

    await this.graphql.mutate<GraphQLResult>(mutation, { cameraId, topicNames });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(
      () => this.pollAlarms(),
      this.config.processing.pollIntervalSeconds * 1000
    );
  }

  private async pollAlarms(): Promise<void> {
    const allowedTriggers = this.config.processing.alarmTriggerTypes;

    for (const [cameraId, topicNames] of this.registeredCameras) {
      for (const topic of topicNames) {
        if (allowedTriggers.includes(topic)) {
          const alarm = await this.checkAlarm(topic);
          if (alarm) {
            this.emit("alarm", { cameraId, eventType: alarm.eventType });
          }
        }
      }
    }
  }

  private async checkAlarm(topic: string): Promise<AlarmEvent | null> {
    const query = gql`
      query GetAnalyticsEvents($topic: String!, $limit: Int!) {
        analyticsEvents(topic: $topic, limit: $limit) {
          id
          cameraId
          timestamp
          eventType
          metadata
        }
      }
    `;

    try {
      const result = await this.graphql.query<GraphQLResult>(query, {
        topic,
        limit: 1,
      });

      if (result.analyticsEvents && result.analyticsEvents.length > 0) {
        return result.analyticsEvents[0];
      }
    } catch (error) {
      console.error("Failed to check alarm:", error);
    }
    return null;
  }

  getRegisteredCameras(): VmsCamera[] {
    const cameras: VmsCamera[] = [];
    for (const [id] of this.registeredCameras) {
      cameras.push({ cameraId: id, name: id, hardwareId: id, status: "active" });
    }
    return cameras;
  }

  async requestVideoStream(cameraId: string): Promise<string> {
    return this.videoHandler.requestStream(cameraId, {
      framerate: this.config.video.maxFramerate,
      resolution: this.config.video.resolution,
    });
  }

  async stopVideoStream(cameraId: string): Promise<void> {
    this.videoHandler.stopStream(cameraId);
  }
}