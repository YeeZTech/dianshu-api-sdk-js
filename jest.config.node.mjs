
export default {
  testEnvironment: 'node',
  testMatch: [
    "**/test/*.test.js"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/test/Browser.*\\.test\\.js$"
  ],
  roots: ['<rootDir>/test', '<rootDir>/src'],
  
  moduleFileExtensions: ['js', 'json', 'jsx'],
  collectCoverage: true,
  coverageDirectory: 'coverage/node' 
};