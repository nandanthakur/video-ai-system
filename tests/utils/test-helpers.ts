import { Response } from "express";
import request from "supertest";
import express, { Application } from "express";

export function createTestApp(routes: (app: Application) => void): Application {
  const app = express();
  app.use(express.json());
  routes(app);
  return app;
}

export async function makeRequest(
  app: Application,
  method: "get" | "post" | "put" | "delete",
  path: string,
  body?: object
): Promise<request.Response> {
  const req = request(app)(method, path);
  if (body) req.send(body);
  return req;
}

export function createMockResponse() {
  const res: Partial<Response> = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

export function mockRequest(body: object = {}) {
  return {
    body,
    query: {},
    params: {},
    headers: {},
  };
}

export function expectStatus(res: request.Response, status: number) {
  expect(res.status).toBe(status);
  return res;
}

export function expectJson(res: request.Response) {
  expect(res.body).toBeDefined();
  return res.body;
}