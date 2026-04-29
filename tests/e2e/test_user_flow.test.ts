import request from "supertest";

const API_BASE = process.env.BASE_URL || "http://localhost:8000";

describe("Video Processing E2E", () => {
  let authToken: string;
  let workflowId: string;

  it("complete video processing flow", async () => {
    const loginRes = await request(API_BASE)
      .post("/token")
      .send({ username: "admin", password: "admin123" });
    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.token;

    const processRes = await request(API_BASE)
      .post("/api/process-video")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        camera_id: "e2e-test-camera",
        video_url: "rtsp://192.168.1.100/stream",
      });
    expect(processRes.status).toBe(200);
    workflowId = processRes.body.workflow_id;

    const statusRes = await request(API_BASE).get(`/api/workflow/${workflowId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.workflowId).toBe(workflowId);
  });
});

describe("Camera Management E2E", () => {
  it("sync cameras from VMS", async () => {
    const syncRes = await request(API_BASE)
      .post("/cameras/sync");
    expect(syncRes.status).toBe(200);
  });

  it("get camera with enabled filter", async () => {
    const res = await request(API_BASE).get("/cameras?enabled=true");
    expect(res.status).toBe(200);
  });
});