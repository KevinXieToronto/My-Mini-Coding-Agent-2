// packages/core/src/tools/ls.ts
import * as fs from 'node:fs/promises';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'List the entries of a directory. Directories end with "/".',
  kind: 'read',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory to list. Defaults to ".".',
      },
    },
    required: [],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const rel = args['path'] === undefined ? '.' : String(args['path']);
    const abs = resolveInCwd(ctx.cwd, rel);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    const lines = entries
      .filter((e) => e.name !== 'node_modules' && e.name !== '.git')
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
    return {
      llmContent: lines.join('\n') || '(empty directory)',
      displayText: `ls ${rel} (${lines.length} entries)`,
    };
  },
};
