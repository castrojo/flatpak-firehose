/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/scripts/keyboard-nav.ts',
    '!src/scripts/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 16,
      lines: 25,
      statements: 30,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
