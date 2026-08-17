// packages/cli/src/ui/types.ts

export type UIRole = 'user' | 'assistant' | 'tool' | 'info';

export interface UIMessage {
  id: string;
  role: UIRole;
  text: string;
  /** tool messages only */
  toolName?: string;
  status?: 'running' | 'ok' | 'error';
}

let counter = 0;
export function nextId(): string {
  return `m${++counter}`;
}
