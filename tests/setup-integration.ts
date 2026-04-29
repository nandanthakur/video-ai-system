beforeAll(async () => {
  process.env.NODE_ENV = "integration";
  process.env.POSTGRES_HOST = "localhost";
  process.env.POSTGRES_PORT = "5432";
  process.env.POSTGRES_DB = "video_ai_test";
  process.env.POSTGRES_USER = "postgres";
  process.env.POSTGRES_PASSWORD = "postgres";
  process.env.KAFKA_BROKERS = "localhost:9092";
  process.env.MINIO_HOST = "localhost";
  process.env.MINIO_PORT = "9000";
});

afterAll(async () => {
  delete process.env.NODE_ENV;
});