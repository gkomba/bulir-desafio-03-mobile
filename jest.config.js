module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // As 16 suites correm em paralelo; sob carga, as esperas por defeito (1 s) ficam curtas.
  testTimeout: 30000,
};
