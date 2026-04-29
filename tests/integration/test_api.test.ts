import request from "supertest";

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

describe("Primary API Integration", () => {
  const baseUrl = BASE_URL;

  describe("Health Endpoint", () => {
    it("GET /health should return 200", async () => {
      const res = await request(baseUrl).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("Authentication", () => {
    it("POST /token with valid credentials", async () => {
      const res = await request(baseUrl)
        .post("/token")
        .send({ username: "admin", password: "admin123" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("POST /token with invalid credentials", async () => {
      const res = await request(baseUrl)
        .post("/token")
        .send({ username: "admin", password: "wrong" });
      expect(res.status).toBe(401);
    });
  });

  describe("Video Processing", () => {
    it("POST /api/process-video with valid request", async () => {
      const res = await request(baseUrl)
        .post("/api/process-video")
        .send({
          camera_id: "test-cam",
          video_url: "rtsp://test/video.mp4",
        });
      expect(res.status).toBe(200);
      expect(res.body.workflow_id).toBeDefined();
    });

    it("POST /api/process-video missing camera_id", async () => {
      const res = await request(baseUrl)
        .post("/api/process-video")
        .send({ video_url: "rtsp://test/video.mp4" });
      expect(res.status).toBe(400);
    });
  });
});

describe("VMS Bridge Integration", () => {
  const baseUrl = "http://localhost:8001";

  it("GET /health should return 200", async () => {
    const res = await request(baseUrl).get("/health");
    expect(res.status).toBe(200);
  });

  it("GET /cameras should return camera list", async () => {
    const res = await request(baseUrl).get("/cameras");
    expect(res.status).toBe(200);
    expect(res.body.cameras).toBeInstanceOf(Array);
  });

  it("GET /cameras?enabled=true should filter enabled", async () => {
    const res = await request(baseUrl).get("/cameras?enabled=true");
    expect(res.status).toBe(200);
  });
});