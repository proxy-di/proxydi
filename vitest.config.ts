import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        chaiConfig: {
            includeStack: true,
        },
        coverage: {
            reporter: [['text', { maxCols: 200 }], 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.test.ts',
                'rollup.config.js',
                'vitest.config.ts',
                'src/__tests__/',
                'src/types.ts',
                'docs/',
                '.claude/',
            ],
        },
    },
});
