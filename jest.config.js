export default {
  transform: {
    "^.+\\.js$": "babel-jest",
},
  testEnvironment: 'node', 
  testPathIgnorePatterns: [
    '<rootDir>/tests/Playwright/', 
  ],
  testMatch: [
    '**/tests/Jest/**/*.test.js',
  ],
};
