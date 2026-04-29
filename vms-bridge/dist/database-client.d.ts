import { Camera } from "./types";
export declare class DatabaseClient {
    private client;
    constructor(config: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getCameras(): Promise<Camera[]>;
    getCamera(cameraId: string): Promise<Camera | null>;
    saveCamera(camera: Camera): Promise<Camera>;
    deleteCamera(cameraId: string): Promise<void>;
    initializeSchema(): Promise<void>;
    private mapRowToCamera;
}
//# sourceMappingURL=database-client.d.ts.map