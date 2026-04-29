export interface StreamOptions {
    proxyPort: number;
    transport: "tcp" | "udp";
}
export declare class VideoStreamHandler {
    private connections;
    private port;
    private transport;
    constructor(options: StreamOptions);
    requestStream(cameraId: string, options: {
        framerate: number;
        resolution: {
            width: number;
            height: number;
        };
    }): Promise<string>;
    stopStream(cameraId: string): void;
    disconnectAll(): void;
}
//# sourceMappingURL=video-stream.d.ts.map