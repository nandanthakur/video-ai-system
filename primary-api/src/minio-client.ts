import { Client } from "minio";

export class MinioClient {
  private client: Client;
  private bucket: string;

  constructor(config: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
  }) {
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  async saveVideo(
    videoUrl: string,
    cameraId: string,
    workflowId: string
  ): Promise<string> {
    const videoKey = `videos/${cameraId}/${workflowId}/input.mp4`;

    const response = await fetch(videoUrl);
    const videoBuffer = await response.arrayBuffer();

    await this.client.putObject(
      this.bucket,
      videoKey,
      Buffer.from(videoBuffer),
      {
        "Content-Type": "video/mp4",
        "X-Camera-Id": cameraId,
        "X-Workflow-Id": workflowId,
      }
    );

    return `minio://${this.bucket}/${videoKey}`;
  }

  async getVideoUrl(bucket: string, key: string): Promise<string> {
    return this.client.presignedGetObject(bucket, key);
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    metadata: Record<string, string> = {}
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, metadata);
  }

  async bucketExists(): Promise<boolean> {
    return this.client.bucketExists(this.bucket);
  }

  async makeBucket(): Promise<void> {
    const exists = await this.bucketExists();
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }
}