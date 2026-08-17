// packages/core/src/permissions/manager.ts
import type { Tool } from '../tools/types.js';
import type { ApprovalMode } from './types.js';

export class PermissionManager {
  private alwaysAllowed = new Set<string>();

  constructor(public mode: ApprovalMode = 'ask') {}

  /** Does this call need a human decision under the current mode? */
  shouldConfirm(tool: Tool): boolean {
    if (tool.kind === 'read') return false;
    if (this.mode === 'yolo') return false;
    if (this.mode === 'auto-edit' && tool.kind === 'edit') return false;
    if (this.alwaysAllowed.has(tool.name)) return false;
    return true;
  }

  /** User answered "always" for this tool — skip future prompts this session. */
  allowAlways(toolName: string): void {
    this.alwaysAllowed.add(toolName);
  }
}
