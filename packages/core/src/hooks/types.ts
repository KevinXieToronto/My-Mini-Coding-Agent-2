// packages/core/src/hooks/types.ts

export type HookEvent = 'preToolUse' | 'postToolUse' | 'stop';

export interface HookConfig {
  /** Substring/regex matched against the tool name. Omitted = every tool. */
  matcher?: string;
  /** Shell command to run. Receives the event payload as JSON on stdin. */
  command: string;
}

export type HooksConfig = Partial<Record<HookEvent, HookConfig[]>>;

export interface HookOutcome {
  /** True if any hook exited with code 2 — the tool call must not run. */
  blocked: boolean;
  /** stderr of the blocking hook (or notes from non-blocking ones). */
  message?: string;
}
