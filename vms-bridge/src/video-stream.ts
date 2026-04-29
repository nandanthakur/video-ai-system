import * as net from "net";

export interface StreamOptions {
  proxyPort: number;
  transport: "tcp" | "udp";
}

export class VideoStreamHandler {
  private connections: Map<string, net.Socket> = new Map();
  private port: number;
  private transport: "tcp" | "udp";

  constructor(options: StreamOptions) {
    this.port = options.proxyPort;
    this.transport = options.transport;
  }

  async requestStream(
    cameraId: string,
    options: { framerate: number; resolution: { width: number; height: number } }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const rtspUrl = `rtsp://localhost:${this.port}/${cameraId}`;

      socket.connect(this.port, "localhost", () => {
        this.connections.set(cameraId, socket);
        resolve(rtspUrl);
      });

      socket.on("error", (err) => {
        reject(err);
      });
    });
  }

  stopStream(cameraId: string): void {
    const socket = this.connections.get(cameraId);
    if (socket) {
      socket.destroy();
      this.connections.delete(cameraId);
    }
  }

  disconnectAll(): void {
    for (const socket of this.connections.values()) {
      socket.destroy();
    }
    this.connections.clear();
  }
}