const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/route.test.ts'
  ],
  // jest.setup.jsを使わない
  setupFilesAfterEnv: [],
}

module.exports = createJestConfig(customJestConfig)