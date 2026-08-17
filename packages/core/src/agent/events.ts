// packages/core/src/agent/events.ts
import type { ToolCallRequest } from '../provider/types.js';
import type { ToolResult } from '../tools/types.js';

/** Everything the UI needs to render an agent turn, as a stream. */
export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; call: ToolCallRequest }
  | { type: 'tool_end'; call: ToolCallRequest; result: ToolResult }
  | { type: 'info'; message: string }
  | { type: 'turn_end' }
  | { type: 'error'; message: string };
