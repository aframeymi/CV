export default {
  // Convert test files with Babel so import/export syntax works
  transform: {
    "^.+\\.js$": "babel-jest",
},
  // Run the tests in a Node.js environment (not a browser)
  testEnvironment: 'node', 
  // Ignore the Playwright folder (those tests are run by Playwright, not Jest)
  testPathIgnorePatterns: [
    '<rootDir>/tests/Playwright/', 
  ],
  // Only run test files named *.test.js inside tests/Jest
  testMatch: [
    '**/tests/Jest/**/*.test.js',
  ],
};

