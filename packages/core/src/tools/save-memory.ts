// packages/core/src/tools/save-memory.ts
import { appendMemory } from '../memory/memory.js';
import type { Tool, ToolResult } from './types.js';

export const saveMemoryTool: Tool = {
  name: 'save_memory',
  description:
    'Save a durable fact about this project or the user to MINICODE.md, ' +
    'so future sessions know it. Use for stable preferences and project facts ' +
    '("tests run with npm test -w core", "the user prefers tabs"), ' +
    'NOT for transient conversation details.',
  kind: 'edit',
  parameters: {
    type: 'object',
    properties: {
      fact: {
        type: 'string',
        description: 'One concise sentence to remember.',
      },
    },
    required: ['fact'],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const file = await appendMemory(ctx.cwd, String(args['fact']));
    return {
      llmContent: `Saved to ${file}.`,
      displayText: `remembered: ${String(args['fact'])}`,
    };
  },
};
