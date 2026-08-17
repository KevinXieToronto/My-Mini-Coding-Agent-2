// packages/core/src/tools/edit-file.ts
import * as fs from 'node:fs/promises';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

export const editFileTool: Tool = {
  name: 'edit_file',
  description:
    'Edit a file by replacing an exact string. old_string must appear ' +
    'EXACTLY ONCE in the file (include enough surrounding lines to make it ' +
    'unique). Use write_file to create files or rewrite them entirely.',
  kind: 'edit',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File to edit.' },
      old_string: {
        type: 'string',
        description: 'Exact text to replace; must be unique in the file.',
      },
      new_string: { type: 'string', description: 'Replacement text.' },
    },
    required: ['path', 'old_string', 'new_string'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const abs = resolveInCwd(ctx.cwd, String(args['path']));
    const oldStr = String(args['old_string']);
    const newStr = String(args['new_string']);
    const text = await fs.readFile(abs, 'utf8');

    const first = text.indexOf(oldStr);
    if (first === -1) {
      return {
        llmContent:
          `old_string not found in ${args['path']}. Read the file again — ` +
          `the content may differ from what you expect (whitespace matters).`,
        isError: true,
      };
    }
    if (text.indexOf(oldStr, first + 1) !== -1) {
      return {
        llmContent:
          `old_string appears more than once in ${args['path']}. ` +
          `Include more surrounding context to make it unique.`,
        isError: true,
      };
    }

    await fs.writeFile(abs, text.replace(oldStr, newStr), 'utf8');
    return {
      llmContent: `Edited ${args['path']}.`,
      displayText: `edited ${args['path']}`,
    };
  },
};
