import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.test.ts',
                'rollup.config.js',
                'vitest.config.ts',
                'src/tests',
                'src/types.ts',
            ],
        },
    },
});
