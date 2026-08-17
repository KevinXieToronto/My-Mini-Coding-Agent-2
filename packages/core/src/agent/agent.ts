// packages/core/src/agent/agent.ts
import type { Message, ModelProvider, ToolCallRequest } from '../provider/types.js';
import { buildSystemPrompt } from '../prompts.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolResult } from '../tools/types.js';
import type { AgentEvent } from './events.js';

export interface AgentOptions {
  provider: ModelProvider;
  model: string;
  tools: ToolRegistry;
  cwd: string;
  /** Safety bound: max model round-trips per user input. */
  maxTurns?: number;
}

export class Agent {
  readonly history: Message[] = [];
  private opts: Required<Pick<AgentOptions, 'maxTurns'>> & AgentOptions;

  constructor(options: AgentOptions) {
    this.opts = { maxTurns: 20, ...options };
    this.history.push({
      role: 'system',
      content: buildSystemPrompt(options.cwd),
    });
  }

  /** Run one user input to completion, streaming events. */
  async *run(userInput: string): AsyncGenerator<AgentEvent> {
    this.history.push({ role: 'user', content: userInput });

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

      this.history.push({
        role: 'assistant',
        content: assistantText,
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      });

      // No tool calls -> the model is done with this user input.
      if (toolCalls.length === 0) {
        yield { type: 'turn_end' };
        return;
      }

      // Execute each requested call and append results to history.
      for (const call of toolCalls) {
        yield { type: 'tool_start', call };
        const result = await this.executeCall(call);
        yield { type: 'tool_end', call, result };
        this.history.push({
          role: 'tool',
          toolCallId: call.id,
          content: result.llmContent,
        });
      }
      // Loop: send the tool results back to the model.
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

    try {
      return await tool.execute(args, { cwd: this.opts.cwd });
    } catch (err) {
      return {
        llmContent: `Tool ${call.name} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        isError: true,
      };
    }
  }
}
