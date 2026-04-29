"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFetcher = void 0;
class VideoFetcher {
    constructor(config) {
        this.activeConnections = new Map();
        this.proxyPort = config.proxyPort;
        this.transport = config.transport;
    }
    async fetchVideo(cameraHardwareId, preAlarmSeconds, postAlarmSeconds) {
        const timestamp = new Date().toISOString();
        const sessionId = `${cameraHardwareId}-${Date.now()}`;
        const request = {
            action: "fetchVideo",
            cameraHardwareId,
            preAlarmSeconds,
            postAlarmSeconds,
            timestamp,
            sessionId,
        };
        console.log("Fetching video for camera:", cameraHardwareId, request);
        return `mock://video/${cameraHardwareId}/${sessionId}.mp4`;
    }
    async stopFetch(sessionId) {
        const socket = this.activeConnections.get(sessionId);
        if (socket) {
            socket.destroy();
            this.activeConnections.delete(sessionId);
        }
    }
    disconnectAll() {
        for (const socket of this.activeConnections.values()) {
            socket.destroy();
        }
        this.activeConnections.clear();
    }
}
exports.VideoFetcher = VideoFetcher;
//# sourceMappingURL=video-fetcher.js.map