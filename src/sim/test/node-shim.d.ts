/**
 * Minimal type declarations for the Node built-ins the tests use. The
 * project has no @types/node (no new dependencies), and the tests only need
 * these few calls. Node 24 runs the tests directly: `npm test`.
 */
declare module "node:test" {
  interface TestContext {
    /** A note printed under the test in the report. */
    diagnostic(message: string): void;
  }
  type TestFn = (t: TestContext) => void | Promise<void>;
  export function test(name: string, fn: TestFn): Promise<void>;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: TestFn): void;
  export default test;
}

declare module "node:assert/strict" {
  interface Assert {
    (value: unknown, message?: string): asserts value;
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    throws(fn: () => unknown, message?: string | RegExp): void;
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
