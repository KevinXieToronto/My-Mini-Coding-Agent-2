// packages/core/src/agent/agent.ts
import type {
  Message,
  ModelProvider,
  ToolCallRequest,
} from '../provider/types.js';
import { buildSystemPrompt } from '../prompts.js';
import { PermissionManager } from '../permissions/manager.js';
import type { ConfirmationRequest, ConfirmFn } from '../permissions/types.js';
import { compressHistory, estimateTokens } from '../session/compress.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Tool, ToolResult } from '../tools/types.js';
import type { AgentEvent } from './events.js';
import type { HookRunner } from '../hooks/runner.js';

export interface AgentOptions {
  provider: ModelProvider;
  model: string;
  tools: ToolRegistry;
  cwd: string;
  /** Safety bound: max model round-trips per user input. */
  maxTurns?: number;
  permissions?: PermissionManager;
  /** Injected by the frontend. If absent while permissions require it, calls are denied. */
  confirm?: ConfirmFn;
  /** Durable memory text, embedded in the system prompt. */
  memory?: string;
  /** Called for every message appended to history (session persistence). */
  onMessage?: (message: Message) => void;
  /** Compress when the estimated token count exceeds this. */
  compressThreshold?: number;
  /** Override the default system prompt (used by subagents). */
  systemPrompt?: string;
  hooks?: HookRunner;
}

export class Agent {
  readonly history: Message[] = [];
  readonly permissions: PermissionManager;
  private opts: Required<Pick<AgentOptions, 'maxTurns' | 'compressThreshold'>> &
    AgentOptions;

  constructor(options: AgentOptions) {
    this.opts = { maxTurns: 20, compressThreshold: 60_000, ...options };
    this.permissions = options.permissions ?? new PermissionManager('ask');
    this.history.push({
      role: 'system',
      content:
        options.systemPrompt ??
        buildSystemPrompt(options.cwd, options.memory),
    });
  }

  get model(): string {
    return this.opts.model;
  }

  setModel(model: string): void {
    this.opts.model = model;
  }

  setProvider(provider: ModelProvider, model: string): void {
    this.opts.provider = provider;
    this.opts.model = model;
  }

  /** Restore a previous session's messages (skips its old system prompt). */
  loadHistory(messages: Message[]): void {
    for (const m of messages) {
      if (m.role === 'system') continue; // fresh system prompt already in place
      this.history.push(m);
    }
  }

  private push(message: Message): void {
    this.history.push(message);
    this.opts.onMessage?.(message);
  }

  /** Run one user input to completion, streaming events. */
  async *run(userInput: string): AsyncGenerator<AgentEvent> {
    // Compress BEFORE adding the new input, if we've grown too large.
    if (estimateTokens(this.history) > this.opts.compressThreshold) {
      yield { type: 'info', message: 'compressing conversation history…' };
      try {
        const compressed = await compressHistory(
          this.opts.provider,
          this.opts.model,
          this.history,
        );
        this.history.length = 0;
        this.history.push(...compressed);
        yield {
          type: 'info',
          message: `history compressed to ~${estimateTokens(this.history)} tokens`,
        };
      } catch (err) {
        yield {
          type: 'info',
          message: `compression failed (continuing uncompressed): ${
            err instanceof Error ? err.message : err
          }`,
        };
      }
    }

    this.push({ role: 'user', content: userInput });

    for (let turn = 0; turn < this.opts.maxTurns; turn++) {
      let assistantText = '';
      let toolCalls: ToolCallRequest[] = [];

      try {
        const stream = this.opts.provider.chat(this.history, {
          model: this.opts.model,
          tools: this.opts.tools.schemas(),
        });
        for await (const event of stream) {
          if (event.type === 'text') {
            assistantText += event.text;
            yield { type: 'text', text: event.text };
          } else if (event.type === 'tool_calls') {
            toolCalls = event.calls;
          }
        }
      } catch (err) {
        yield {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        };
        return;
      }

      this.push({
        role: 'assistant',
        content: assistantText,
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      });

      if (toolCalls.length === 0) {
        if (this.opts.hooks?.hasHooks('stop')) {
          const stop = await this.opts.hooks.run('stop', {
            tool: '',
            cwd: this.opts.cwd,
          });
          if (stop.message) yield { type: 'info', message: stop.message };
        }
        yield { type: 'turn_end' };
        return;
      }

      for (const call of toolCalls) {
        yield { type: 'tool_start', call };
        const result = await this.executeCall(call);
        yield { type: 'tool_end', call, result };
        this.push({
          role: 'tool',
          toolCallId: call.id,
          content: result.llmContent,
        });
      }
    }

    yield {
      type: 'error',
      message: `Stopped after ${this.opts.maxTurns} turns without a final answer.`,
    };
  }

  private async executeCall(call: ToolCallRequest): Promise<ToolResult> {
    const tool = this.opts.tools.get(call.name);
    if (!tool) {
      return {
        llmContent: `Unknown tool: ${call.name}. Available: ${this.opts.tools
          .list()
          .map((t) => t.name)
          .join(', ')}`,
        isError: true,
      };
    }

    let args: Record<string, unknown>;
    try {
      args = call.arguments.trim() === '' ? {} : JSON.parse(call.arguments);
    } catch {
      return {
        llmContent: `Invalid JSON in tool arguments: ${call.arguments}`,
        isError: true,
      };
    }

    // ---- preToolUse hooks ------------------------------------------------
    if (this.opts.hooks) {
      const pre = await this.opts.hooks.run('preToolUse', {
        tool: call.name,
        args,
        cwd: this.opts.cwd,
      });
      if (pre.blocked) {
        return {
          llmContent: `Tool call blocked by a user-configured hook: ${pre.message}`,
          isError: true,
        };
      }
    }
    // ----------------------------------------------------------------------

    if (this.permissions.shouldConfirm(tool)) {
      const outcome = await this.requestConfirmation(tool, args);
      if (outcome === 'no') {
        return {
          llmContent:
            'The user denied this tool call. Ask them how to proceed ' +
            'instead of retrying the same call.',
          isError: true,
        };
      }
      if (outcome === 'yes-always') {
        this.permissions.allowAlways(tool.name);
      }
    }

    try {
      const result = await tool.execute(args, { cwd: this.opts.cwd });
      if (this.opts.hooks) {
        const post = await this.opts.hooks.run('postToolUse', {
          tool: call.name,
          args,
          isError: result.isError ?? false,
          cwd: this.opts.cwd,
        });
        if (post.message) {
          result.llmContent += `\n[hook note] ${post.message}`;
        }
      }
      return result;
    } catch (err) {
      return {
        llmContent: `Tool ${call.name} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        isError: true,
      };
    }
  }

  private async requestConfirmation(
    tool: Tool,
    args: Record<string, unknown>,
  ): Promise<'yes' | 'yes-always' | 'no'> {
    if (!this.opts.confirm) return 'no';

    const req: ConfirmationRequest = {
      tool: tool.name,
      kind: tool.kind,
      summary: summarize(tool.name, args),
    };
    if (tool.kind === 'execute' && typeof args['command'] === 'string') {
      req.command = args['command'];
    }
    if (tool.preview) {
      try {
        req.diff = await tool.preview(args, { cwd: this.opts.cwd });
      } catch {
        // Preview failure must not block the flow; the summary still shows.
      }
    }
    return this.opts.confirm(req);
  }
}

function summarize(name: string, args: Record<string, unknown>): string {
  const target = args['path'] ?? args['command'] ?? args['fact'] ?? '';
  return `${name} ${String(target)}`.trim();
}
