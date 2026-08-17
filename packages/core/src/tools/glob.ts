// packages/core/src/tools/glob.ts
import * as fs from 'node:fs/promises';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

const MAX_RESULTS = 500;

export const globTool: Tool = {
  name: 'glob',
  description:
    'Find files by glob pattern, e.g. "**/*.ts" or "src/**/*.test.ts". ' +
    'Returns paths relative to the working directory.',
  kind: 'read',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern.' },
    },
    required: ['pattern'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const pattern = String(args['pattern']);
    const results: string[] = [];
    for await (const entry of fs.glob(pattern, {
      cwd: ctx.cwd,
      exclude: (name: string) =>
        name === 'node_modules' || name === '.git' || name === 'dist',
    })) {
      results.push(entry);
      if (results.length >= MAX_RESULTS) break;
    }
    results.sort();
    return {
      llmContent: results.join('\n') || 'No files matched.',
      displayText: `glob ${pattern} (${results.length} matches)`,
    };
  },
};
