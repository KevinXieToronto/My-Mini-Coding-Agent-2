// packages/core/src/tools/types.ts

/** Coarse classification, used by the permission system in tutorial 04. */
export type ToolKind = 'read' | 'edit' | 'execute' | 'fetch';

export interface ToolResult {
  /** What the model sees. Keep it informative but bounded. */
  llmContent: string;
  /** Optional shorter/nicer text for the human in the terminal. */
  displayText?: string;
  isError?: boolean;
}

export interface ToolContext {
  /** The directory the agent operates in. All relative paths resolve here. */
  cwd: string;
  signal?: AbortSignal;
}

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema for the arguments — this is what the model reads. */
  parameters: Record<string, unknown>;
  kind: ToolKind;
  execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult>;
  /** Optional: unified-diff preview before execution (tutorial 04). */
  preview?(args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}
