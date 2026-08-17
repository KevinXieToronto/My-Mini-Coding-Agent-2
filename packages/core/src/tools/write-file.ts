// packages/core/src/tools/write-file.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Create a file or completely overwrite an existing one with new content. ' +
    'Parent directories are created automatically.',
  kind: 'edit',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write.' },
      content: { type: 'string', description: 'Full new file content.' },
    },
    required: ['path', 'content'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const abs = resolveInCwd(ctx.cwd, String(args['path']));
    const content = String(args['content']);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    return {
      llmContent: `Wrote ${Buffer.byteLength(content)} bytes to ${args['path']}.`,
      displayText: `wrote ${args['path']}`,
    };
  },
};
