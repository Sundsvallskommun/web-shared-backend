import { defineConfig } from 'vitest/config';

// Baseline config for every @sk-web-backend package. The .mts extension is deliberate: these
// packages are CJS (no "type": "module"), so a .ts config gets loaded as CommonJS and Vite warns
// that its ESM syntax will stop working. .mts marks it ESM without touching the package's own
// module system. Tests are colocated in src/ so that
// declarationMap/sourceMap still resolve for consumers, and excluded from both the tsc build
// (tsconfig.json) and the published tarball (package.json "files").
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      // No thresholds yet. 0.0.1 is a no-op placeholder, so any number here would be
      // meaningless. Set real ones when 0.1.0 ships actual SAML code.
    },
  },
});
