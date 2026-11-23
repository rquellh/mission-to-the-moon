import cloudflare from '@cloudflare/oxlint-config';
import { defineConfig } from 'oxlint';

// The rules come from Cloudflare's preset, and every rule it turns on is an
// error. The rules listed here are off because the code does not pass them yet.
// The number beside each is how many places it flagged when the preset was
// added. To turn one on, delete its line and fix what it finds.
export default defineConfig({
  extends: [cloudflare],
  // oxlint reads these two from this file only, so they are passed along by hand.
  env: cloudflare.env,
  ignorePatterns: cloudflare.ignorePatterns,
  rules: {
    // How the code is laid out. `oxlint --fix` can make most of these changes.
    curly: 'off', // 1,020: braces around every `if` body
    'typescript/array-type': 'off', // 630: `Array<T>` in place of `T[]`
    'unicorn/numeric-separators-style': 'off', // 142: `384_400` in place of `384400`
    'import/consistent-type-specifier-style': 'off', // 142: `import type { A }` in place of `import { type A }`
    'typescript/consistent-type-imports': 'off', // 8

    // How this project is built. Each of these asks for a different design.
    'typescript/no-non-null-assertion': 'off', // 303: `list[i]!`, which noUncheckedIndexedAccess asks for
    'typescript/no-unsafe-type-assertion': 'off', // 182
    'unicorn/consistent-function-scoping': 'off', // 62
    'typescript/unbound-method': 'off', // 35
    'no-console': 'off', // 34
    '@nkzw/no-instanceof': 'off', // 24
    // There is no React here; a function named `use...` is an ordinary function.
    'react/rules-of-hooks': 'off', // 1

    // Small, and worth turning on one at a time.
    'typescript/no-unnecessary-type-assertion': 'off', // 34
    'unicorn/prefer-at': 'off', // 30
    'unicorn/prefer-single-call': 'off', // 17
    'unicorn/prefer-top-level-await': 'off', // 4
    'unicorn/prefer-number-properties': 'off', // 4
    'typescript/no-unsafe-argument': 'off', // 4
    'typescript/no-unsafe-member-access': 'off', // 3
    'unicorn/prefer-string-replace-all': 'off', // 2
    'no-promise-executor-return': 'off', // 2
    'unicorn/prefer-set-has': 'off', // 1
    'unicorn/prefer-native-coercion-functions': 'off', // 1
    'unicorn/no-useless-spread': 'off', // 1
    'typescript/use-unknown-in-catch-callback-variable': 'off', // 1
    'typescript/require-array-sort-compare': 'off', // 1
    'typescript/no-unsafe-call': 'off', // 1
    'typescript/no-import-type-side-effects': 'off', // 1
    'typescript/no-floating-promises': 'off', // 1
    'oxc/approx-constant': 'off', // 1

    // The anti-slop rules that still find something.
    'quality/no-known-value-widening': 'off', // 52
    'quality/no-chained-type-assertions': 'off', // 10
    'quality/no-conditional-empty-object-spread': 'off', // 7
    'quality/no-unsafe-dictionary-type': 'off', // 5
    'quality/no-unknown-returns': 'off', // 3
    'quality/no-array-filter-map': 'off', // 2
  },
});
