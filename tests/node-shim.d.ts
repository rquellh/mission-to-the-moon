/**
 * The one Node global the browser tests read: environment variables. The
 * project has no @types/node (see src/sim/test/node-shim.d.ts).
 */
declare const process: { env: Record<string, string | undefined> };
