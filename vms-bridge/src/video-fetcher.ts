import * as net from "net";

export interface VideoFetcherConfig {
  proxyPort: number;
  transport: "tcp" | "udp";
}

export interface FetchedVideo {
  cameraId: string;
  url: string;
  preAlarmSeconds: number;
  postAlarmSeconds: number;
  timestamp: string;
}

export class VideoFetcher {
  private proxyPort: number;
  private transport: "tcp" | "udp";
  private activeConnections = new Map<string, net.Socket>();

  constructor(config: VideoFetcherConfig) {
    this.proxyPort = config.proxyPort;
    this.transport = config.transport;
  }

  async fetchVideo(
    cameraHardwareId: string,
    preAlarmSeconds: number,
    postAlarmSeconds: number
  ): Promise<string> {
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

  async stopFetch(sessionId: string): Promise<void> {
    const socket = this.activeConnections.get(sessionId);
    if (socket) {
      socket.destroy();
      this.activeConnections.delete(sessionId);
    }
  }

  disconnectAll(): void {
    for (const socket of this.activeConnections.values()) {
      socket.destroy();
    }
    this.activeConnections.clear();
  }
}