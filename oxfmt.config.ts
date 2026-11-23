import { defineConfig } from 'oxfmt';

// These are the settings Cloudflare's oxlint-config repo formats its own code
// with (the `fmt` block of its vite.config.ts). Anything not listed here keeps
// oxfmt's default: semicolons, trailing commas, and lines up to 100 wide.
export default defineConfig({
  singleQuote: true,
  sortImports: {
    newlinesBetween: false,
  },
  sortPackageJson: {
    sortScripts: true,
  },
});
