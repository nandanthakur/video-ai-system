module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFiles: ["<rootDir>/tests/setup-integration.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/teardown-integration.ts"],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  reporters: ["default", "jest-junit"],
  coverageDirectory: "coverage/integration",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};