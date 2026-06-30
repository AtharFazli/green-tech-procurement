module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/*.test.js'],
  forceExit: true,
  detectOpenHandles: true,
  verbose: true
};
