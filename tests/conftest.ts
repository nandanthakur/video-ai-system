import { Config } from "../config/test-config";

export const globalConfig = {
  testTimeout: 5000,
  verbose: true,
};

export function setupTestEnvironment() {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });
}

export function useMockTimer() {
  jest.useFakeTimers();
  afterEach(() => {
    jest.useRealTimers();
  });
}

export function cleanupMocks() {
  afterEach(() => {
    jest.clearAllMocks();
  });
}

export { Config };