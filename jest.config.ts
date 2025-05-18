// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};

export default config;

