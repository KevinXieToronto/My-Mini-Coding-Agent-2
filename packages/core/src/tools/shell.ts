// packages/core/src/tools/shell.ts
import { exec } from 'node:child_process';
import type { Tool, ToolResult } from './types.js';

const TIMEOUT_MS = 60_000;
const MAX_OUTPUT = 20_000;

export const runShellTool: Tool = {
  name: 'run_shell',
  description:
    'Run a shell command in the working directory and return stdout/stderr. ' +
    'On Windows commands run under cmd.exe. Times out after 60 seconds.',
  kind: 'execute',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command to run.' },
    },
    required: ['command'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const command = String(args['command']);
    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: ctx.cwd,
          timeout: TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024,
          signal: ctx.signal,
        },
        (error, stdout, stderr) => {
          const clip = (s: string): string =>
            s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n[...truncated]' : s;
          const parts: string[] = [];
          if (stdout) parts.push(`stdout:\n${clip(stdout)}`);
          if (stderr) parts.push(`stderr:\n${clip(stderr)}`);
          if (error) {
            parts.push(
              error.killed
                ? `command timed out after ${TIMEOUT_MS / 1000}s`
                : `exit code: ${error.code ?? 'unknown'}`,
            );
          }
          resolve({
            llmContent: parts.join('\n') || '(no output, exit code 0)',
            displayText: `$ ${command}`,
            isError: Boolean(error),
          });
        },
      );
    });
  },
};
