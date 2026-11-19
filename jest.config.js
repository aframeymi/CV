export default {
  // Convert test files with Babel so import/export syntax works
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  // Run the tests in a Node.js environment (not a browser)
  testEnvironment: 'node',
  // Only run test files named *.test.js inside tests/Jest
  testMatch: [
    '**/tests/Jest/**/*.test.js',
  ],
  // Swap the real services for fakes, so no test can reach real Firebase or the real database
  moduleNameMapper: {
    '/config/firebase\\.js$': '<rootDir>/tests/Jest/mocks/firebase.js',
    '/prismaClient\\.js$': '<rootDir>/tests/Jest/mocks/prismaClient.js',
  },
  // Clear every fake's behaviour before each test, so tests can't affect each other
  resetMocks: true,
};
