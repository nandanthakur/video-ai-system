export const testConfig = {
  database: {
    host: "localhost",
    port: 5432,
    database: "video_ai_test",
    user: "postgres",
    password: "postgres",
  },
  kafka: {
    brokers: ["localhost:9092"],
    topicPrefix: "video-ai-test",
  },
  minio: {
    endpoint: "localhost",
    port: 9000,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "video-ai-test",
    useSSL: false,
  },
  api: {
    baseUrl: "http://localhost:8000",
  },
};

export const developmentConfig = {
  ...testConfig,
  logLevel: "debug",
};

export const productionConfig = {
  ...testConfig,
  logLevel: "error",
};