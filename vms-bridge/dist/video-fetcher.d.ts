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
export declare class VideoFetcher {
    private proxyPort;
    private transport;
    private activeConnections;
    constructor(config: VideoFetcherConfig);
    fetchVideo(cameraHardwareId: string, preAlarmSeconds: number, postAlarmSeconds: number): Promise<string>;
    stopFetch(sessionId: string): Promise<void>;
    disconnectAll(): void;
}
//# sourceMappingURL=video-fetcher.d.ts.map