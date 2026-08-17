// packages/core/src/hooks/runner.ts
import { spawn } from 'node:child_process';
import type { HookConfig, HookEvent, HookOutcome, HooksConfig } from './types.js';

const HOOK_TIMEOUT_MS = 30_000;

export class HookRunner {
  constructor(
    private config: HooksConfig,
    private cwd: string,
  ) {}

  hasHooks(event: HookEvent): boolean {
    return (this.config[event]?.length ?? 0) > 0;
  }

  /**
   * Run every hook registered for `event` whose matcher matches
   * `payload.tool` (if any). Exit code 2 blocks; anything else is advisory.
   */
  async run(
    event: HookEvent,
    payload: Record<string, unknown>,
  ): Promise<HookOutcome> {
    const hooks = (this.config[event] ?? []).filter((h) =>
      matches(h, String(payload['tool'] ?? '')),
    );
    const notes: string[] = [];

    for (const hook of hooks) {
      const result = await this.execHook(hook, event, payload);
      if (result.code === 2) {
        return {
          blocked: true,
          message: result.stderr.trim() || `blocked by hook: ${hook.command}`,
        };
      }
      if (result.stderr.trim()) notes.push(result.stderr.trim());
    }
    return { blocked: false, message: notes.join('\n') || undefined };
  }

  private execHook(
    hook: HookConfig,
    event: HookEvent,
    payload: Record<string, unknown>,
  ): Promise<{ code: number; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(hook.command, {
        cwd: this.cwd,
        shell: true, // cmd.exe on Windows
        env: {
          ...process.env,
          MINICODE_HOOK_EVENT: event,
          MINICODE_TOOL_NAME: String(payload['tool'] ?? ''),
        },
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

      const timer = setTimeout(() => child.kill(), HOOK_TIMEOUT_MS);
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code: code ?? 1, stderr });
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        // A hook that cannot even start must not silently allow the call.
        resolve({ code: 2, stderr: `hook failed to start: ${err.message}` });
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }
}

function matches(hook: HookConfig, toolName: string): boolean {
  if (!hook.matcher) return true;
  try {
    return new RegExp(hook.matcher).test(toolName);
  } catch {
    return hook.matcher === toolName;
  }
}
