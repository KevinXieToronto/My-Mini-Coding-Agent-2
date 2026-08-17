// packages/cli/src/input/shellPassthrough.ts
import { exec } from 'node:child_process';

const TIMEOUT_MS = 60_000;
const MAX_OUTPUT = 10_000;

export function runShellPassthrough(command: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const clip = (s: string): string =>
        s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n[...truncated]' : s;
      const parts: string[] = [];
      if (stdout) parts.push(clip(stdout));
      if (stderr) parts.push(clip(stderr));
      if (error) parts.push(`(exit code ${error.code ?? 'killed'})`);
      resolve(parts.join('\n').trim() || '(no output)');
    });
  });
}
