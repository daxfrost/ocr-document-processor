// jest.config.mjs
export default {
    testEnvironment: 'jest-environment-jsdom', // Ensure this is set correctly
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Setup file for additional configurations
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1', // Alias for imports
    },
    testPathIgnorePatterns: ['/node_modules/', '/.next/'], // Ignore these directories
    transform: {
      '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest', // Use babel-jest for JavaScript and TypeScript files
    },
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json', // Use your existing tsconfig.json
      },
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
  };