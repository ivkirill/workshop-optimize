const { createCjsPreset } = require('jest-preset-angular/presets');

/** Shipped jest config — runs the specs the agent sees (src/**​/*.spec.ts). */
module.exports = {
  ...createCjsPreset({ tsconfig: '<rootDir>/tsconfig.spec.json' }),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
