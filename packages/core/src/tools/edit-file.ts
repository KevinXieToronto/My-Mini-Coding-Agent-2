// packages/core/src/tools/edit-file.ts
import * as fs from 'node:fs/promises';
import { createTwoFilesPatch } from 'diff';
import { resolveInCwd } from './paths.js';
import type { Tool, ToolResult } from './types.js';

/** Apply the replacement, or explain (for the model) why it can't be done. */
async function computeEdit(
  cwd: string,
  args: Record<string, unknown>,
): Promise<
  | { ok: true; abs: string; before: string; after: string }
  | { ok: false; error: string }
> {
  const rel = String(args['path']);
  const abs = resolveInCwd(cwd, rel);
  const oldStr = String(args['old_string']);
  const newStr = String(args['new_string']);

  let before: string;
  try {
    before = await fs.readFile(abs, 'utf8');
  } catch {
    return { ok: false, error: `File not found: ${rel}` };
  }

  const first = before.indexOf(oldStr);
  if (first === -1) {
    return {
      ok: false,
      error:
        `old_string not found in ${rel}. Read the file again — the content ` +
        `may differ from what you expect (whitespace matters).`,
    };
  }
  if (before.indexOf(oldStr, first + 1) !== -1) {
    return {
      ok: false,
      error:
        `old_string appears more than once in ${rel}. Include more ` +
        `surrounding context to make it unique.`,
    };
  }
  return { ok: true, abs, before, after: before.replace(oldStr, newStr) };
}

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
  async preview(args, ctx): Promise<string> {
    const rel = String(args['path']);
    const edit = await computeEdit(ctx.cwd, args);
    if (!edit.ok) return `(cannot preview: ${edit.error})`;
    return createTwoFilesPatch(rel, rel, edit.before, edit.after, '', '', {
      context: 3,
    });
  },
  async execute(args, ctx): Promise<ToolResult> {
    const edit = await computeEdit(ctx.cwd, args);
    if (!edit.ok) {
      return { llmContent: edit.error, isError: true };
    }
    await fs.writeFile(edit.abs, edit.after, 'utf8');
    return {
      llmContent: `Edited ${args['path']}.`,
      displayText: `edited ${args['path']}`,
    };
  },
};
