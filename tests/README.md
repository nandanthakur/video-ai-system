# Video AI System Test Framework

Test configuration for the Video AI Processing Platform.

## Structure

```
tests/
├── unit/           # Unit tests (in service directories)
├── integration/   # Integration API tests
├── e2e/          # End-to-end user flows
├── performance/   # Load/performance tests
├── config/       # Test configurations
├── fixtures/     # Test data & mocks
└── utils/       # Test helpers
```

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run all tests with coverage
npm run test:coverage
```

## Test Categories

- **unit/**: Service-specific unit tests (in each service's `tests/` dir)
- **integration/**: API integration tests (database, Kafka, MinIO)
- **e2e/**: Full user flow tests
- **performance/**: Load and benchmark tests

## Configuration Files

- `jest.unit.config.js` - Unit test configuration
- `jest.integration.config.js` - Integration test configuration  
- `jest.e2e.config.js` - E2E test configuration
- `jest.performance.config.js` - Performance test configuration