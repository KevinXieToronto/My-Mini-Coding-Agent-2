// packages/core/src/tools/paths.ts
import * as path from 'node:path';

/**
 * Resolve a model-supplied path against cwd and refuse to escape it.
 * The model is untrusted input: "..\\..\\Windows\\system32" must not work.
 */
export function resolveInCwd(cwd: string, p: string): string {
  const abs = path.resolve(cwd, p);
  const root = path.resolve(cwd);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`Path escapes the working directory: ${p}`);
  }
  return abs;
}
