import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built site works from any subpath,
  // such as https://<user>.github.io/<repo>/.
  base: './',
  build: {
    target: 'es2022',
    // three.js is large on its own; keep the warning meaningful for our code.
    chunkSizeWarningLimit: 800,
  },
});
