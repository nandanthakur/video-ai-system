"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneBridge = void 0;
const events_1 = require("events");
const graphql_client_1 = require("./graphql-client");
const video_stream_1 = require("./video-stream");
class MilestoneBridge extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.pollInterval = null;
        this.registeredCameras = new Map();
        this.alarmStates = new Map();
        this.config = config;
        this.graphql = new graphql_client_1.GraphQLClient(config.aiBridge.graphqlEndpoint);
        this.videoHandler = new video_stream_1.VideoStreamHandler({
            proxyPort: config.aiBridge.videoProxyPort,
            transport: config.video.rtspTransport,
        });
    }
    async start() {
        await this.registerIVAApplication();
        await this.subscribeCameras();
        this.startPolling();
        this.emit("started");
    }
    async stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.videoHandler.disconnectAll();
        this.emit("stopped");
    }
    async getCamerasFromVms() {
        const query = (0, graphql_client_1.gql) `
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
            const result = await this.graphql.query(query);
            return result.cameras || [];
        }
        catch (error) {
            console.error("Failed to get cameras from VMS:", error);
            return [];
        }
    }
    async setAlarm(cameraId, alarmState, reason) {
        const mutation = (0, graphql_client_1.gql) `
      mutation SetAlarm($input: SetAlarmInput!) {
        setAlarm(input: $input) {
          success
        }
      }
    `;
        try {
            await this.graphql.mutate(mutation, {
                input: {
                    cameraId,
                    alarmState,
                    reason,
                    timestamp: new Date().toISOString(),
                },
            });
            this.alarmStates.set(cameraId, alarmState);
            console.log(`Alarm set to ${alarmState} for camera ${cameraId}: ${reason}`);
        }
        catch (error) {
            console.error("Failed to set alarm:", error);
        }
    }
    getAlarmState(cameraId) {
        return this.alarmStates.get(cameraId);
    }
    async registerIVAApplication() {
        const mutation = (0, graphql_client_1.gql) `
      mutation Register($input: RegisterIVAApplicationInput!) {
        registerIVAApplication(input: $input) {
          id
          name
          status
        }
      }
    `;
        const result = await this.graphql.mutate(mutation, {
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
    async subscribeCameras() {
        const query = (0, graphql_client_1.gql) `
      query GetCameras {
        cameras {
          cameraId
          name
          hardwareId
          status
        }
      }
    `;
        const result = await this.graphql.query(query);
        const cameras = result.cameras || [];
        const filter = this.config.processing.cameraFilter;
        const filteredCameras = filter.length > 0
            ? cameras.filter((c) => filter.includes(c.cameraId))
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
    async subscribeCameraToTopics(cameraId, topicNames) {
        const mutation = (0, graphql_client_1.gql) `
      mutation Subscribe($cameraId: ID!, $topicNames: [String!]!) {
        subscribeCameraToTopics(
          cameraId: $cameraId
          topicNames: $topicNames
        ) {
          success
        }
      }
    `;
        await this.graphql.mutate(mutation, { cameraId, topicNames });
    }
    startPolling() {
        this.pollInterval = setInterval(() => this.pollAlarms(), this.config.processing.pollIntervalSeconds * 1000);
    }
    async pollAlarms() {
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
    async checkAlarm(topic) {
        const query = (0, graphql_client_1.gql) `
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
            const result = await this.graphql.query(query, {
                topic,
                limit: 1,
            });
            if (result.analyticsEvents && result.analyticsEvents.length > 0) {
                return result.analyticsEvents[0];
            }
        }
        catch (error) {
            console.error("Failed to check alarm:", error);
        }
        return null;
    }
    getRegisteredCameras() {
        const cameras = [];
        for (const [id] of this.registeredCameras) {
            cameras.push({ cameraId: id, name: id, hardwareId: id, status: "active" });
        }
        return cameras;
    }
    async requestVideoStream(cameraId) {
        return this.videoHandler.requestStream(cameraId, {
            framerate: this.config.video.maxFramerate,
            resolution: this.config.video.resolution,
        });
    }
    async stopVideoStream(cameraId) {
        this.videoHandler.stopStream(cameraId);
    }
}
exports.MilestoneBridge = MilestoneBridge;
//# sourceMappingURL=milestone-bridge.js.map