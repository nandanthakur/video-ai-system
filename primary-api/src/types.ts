export interface PrimaryApiConfig {
  minio: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
  };
  kafka: {
    brokers: string[];
    topicPrefix: string;
  };
  vmsBridge: {
    baseUrl: string;
  };
  server: {
    port: number;
  };
}