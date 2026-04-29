import { EventEmitter } from "events";
import { MilestoneConfig, VmsCamera } from "./types";
export declare class MilestoneBridge extends EventEmitter {
    private config;
    private graphql;
    private videoHandler;
    private pollInterval;
    private registeredCameras;
    private alarmStates;
    constructor(config: MilestoneConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getCamerasFromVms(): Promise<VmsCamera[]>;
    setAlarm(cameraId: string, alarmState: "OPEN" | "CLOSED", reason: string): Promise<void>;
    getAlarmState(cameraId: string): "OPEN" | "CLOSED" | undefined;
    private registerIVAApplication;
    private subscribeCameras;
    private subscribeCameraToTopics;
    private startPolling;
    private pollAlarms;
    private checkAlarm;
    getRegisteredCameras(): VmsCamera[];
    requestVideoStream(cameraId: string): Promise<string>;
    stopVideoStream(cameraId: string): Promise<void>;
}
//# sourceMappingURL=milestone-bridge.d.ts.map