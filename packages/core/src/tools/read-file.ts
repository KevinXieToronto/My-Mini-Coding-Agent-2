// packages/core/src/tools/read-file.ts
import * as fs from 'node:fs/promises';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

const MAX_CHARS = 100_000;

export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Read a text file and return its contents with line numbers. ' +
    'Paths are relative to the working directory.',
  kind: 'read',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read.' },
    },
    required: ['path'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const abs = resolveInCwd(ctx.cwd, String(args['path']));
    let text = await fs.readFile(abs, 'utf8');
    let truncated = false;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      truncated = true;
    }
    const numbered = text
      .split('\n')
      .map((line, i) => `${String(i + 1).padStart(5)}| ${line}`)
      .join('\n');
    return {
      llmContent: numbered + (truncated ? '\n[...truncated]' : ''),
      displayText: `read ${args['path']}`,
    };
  },
};
