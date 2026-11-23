/**
 * Minimal type declarations for the Node built-ins the tests use. The
 * project has no @types/node, and the tests only need these few calls.
 * Vitest runs the tests: `npm test`.
 */
declare module "node:assert/strict" {
  interface Assert {
    (value: unknown, message?: string): asserts value;
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    throws(fn: () => void, message?: string | RegExp): void;
    fail(message?: string): never;
  }
  const assert: Assert;
  export default assert;
}

declare module "node:fs" {
  export function readFileSync(path: URL | string, encoding: "utf8"): string;
  export function existsSync(path: URL | string): boolean;
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export function readdirSync(path: URL | string, options: { withFileTypes: true }): Dirent[];
}
