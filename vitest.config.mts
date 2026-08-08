import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        // Set explicitly rather than via tsconfig path resolution: the main
        // tsconfig.json excludes test files and this config itself to keep
        // Next.js's own build-time typecheck from OOMing on Vite/Vitest's
        // large plugin type surface, which means tsconfig-based resolvers
        // no longer see these files as part of that project.
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/**/*.test.ts'],
    },
});
