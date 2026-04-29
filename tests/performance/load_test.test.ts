import request from "supertest";

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

describe("Performance Tests", () => {
  describe("API Response Times", () => {
    it("GET /health should respond < 100ms", async () => {
      const start = Date.now();
      await request(BASE_URL).get("/health");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it("POST /token should respond < 200ms", async () => {
      const start = Date.now();
      await request(BASE_URL)
        .post("/token")
        .send({ username: "admin", password: "admin123" });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(200);
    });

    it("POST /api/process-video should respond < 500ms", async () => {
      const start = Date.now();
      await request(BASE_URL)
        .post("/api/process-video")
        .send({
          camera_id: "perf-test",
          video_url: "rtsp://test/video.mp4",
        });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Load Test", () => {
    const concurrentRequests = 50;

    it(`should handle ${concurrentRequests} concurrent requests`, async () => {
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => request(BASE_URL).get("/health"));
      
      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.status === 200).length;
      expect(successes).toBe(concurrentRequests);
    });
  });
});