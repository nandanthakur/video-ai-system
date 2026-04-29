module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/performance"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 120000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  coverageDirectory: "coverage/performance",
};