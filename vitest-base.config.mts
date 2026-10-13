import { defineConfig } from 'vitest/config';

// Loaded by the Angular `unit-test` builder (see angular.json → test.runnerConfig).
// jsdom only offers localStorage to documents with an HTTP origin, hence the URL.
export default defineConfig({
  test: {
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
  },
});
