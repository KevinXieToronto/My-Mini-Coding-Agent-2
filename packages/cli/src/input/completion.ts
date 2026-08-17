// packages/cli/src/input/completion.ts
import * as fs from 'node:fs/promises';

const MAX_FILES = 2000;

/** Subsequence fuzzy match: every query char appears in order. */
export function fuzzyMatch(query: string, candidate: string): boolean {
  let qi = 0;
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  for (let ci = 0; ci < c.length && qi < q.length; ci++) {
    if (c[ci] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** List project files once per completion request (fine at tutorial scale). */
export async function completeAtToken(
  partial: string,
  cwd: string,
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of fs.glob('**/*', {
    cwd,
    exclude: (name: string) =>
      name === 'node_modules' || name === '.git' || name === 'dist',
  })) {
    files.push(entry.replaceAll('\\', '/'));
    if (files.length >= MAX_FILES) break;
  }
  return files
    .filter((f) => fuzzyMatch(partial, f))
    .sort((a, b) => a.length - b.length)
    .slice(0, 8);
}
