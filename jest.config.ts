export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    'main.ts',
    'app.module.ts',
    'app.config.ts',
    '.*\\.module.ts',
    '.*\\.schema.ts',
  ],
};
