import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        chaiConfig: {
            includeStack: true,
        },
        coverage: {
            reporter: ['text', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.test.ts',
                'rollup.config.js',
                'vitest.config.ts',
                'tests/',
                'src/types.ts',
                'docs/',
            ],
        },
    },
});
