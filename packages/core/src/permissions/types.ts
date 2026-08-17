// packages/core/src/permissions/types.ts
import type { ToolKind } from '../tools/types.js';

/**
 * ask       — confirm every mutating tool call
 * auto-edit — file edits run silently; shell/fetch still confirm
 * yolo      — nothing confirms (containers, CI, the brave)
 */
export type ApprovalMode = 'ask' | 'auto-edit' | 'yolo';

/** Everything a UI needs to render a confirmation dialog. */
export interface ConfirmationRequest {
  tool: string;
  kind: ToolKind;
  /** One-line human summary, e.g. `edit_file src/app.ts`. */
  summary: string;
  /** Unified diff — present for file edits. */
  diff?: string;
  /** The exact command — present for shell calls. */
  command?: string;
}

export type ConfirmOutcome = 'yes' | 'yes-always' | 'no';

/** Provided by the frontend; the agent calls it and awaits the human. */
export type ConfirmFn = (req: ConfirmationRequest) => Promise<ConfirmOutcome>;
