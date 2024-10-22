import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globalSetup: './tests/setup/setup.ts',
    globalTeardown: './tests/setup/teardown.ts',
    setupFilesAfterEnv: ['jest-extended/all'],
    coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
    reporters: ['default'/*, 'jest-junit'*/],
    runner: 'jest-serial-runner',
    roots: ['<rootDir>'],
    testMatch: ['<rootDir>/tests/integration/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.ts'],
    modulePaths: [compilerOptions.baseUrl],
    //moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
};

export default config;
