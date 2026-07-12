import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    // ponytail: vite dev server serves /example + /resources + /dist from repo root
    command: 'yarn build && npx vite --port 4173 --strictPort',
    url: 'http://localhost:4173/example/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
