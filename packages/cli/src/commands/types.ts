// packages/cli/src/commands/types.ts
import type { Agent } from '@minicode/core';
import type { CommandRegistry } from './registry.js';

export interface CommandContext {
  agent: Agent;
  commands: CommandRegistry;
  ui: {
    addInfo(text: string): void;
    clear(): void;
    exit(): void;
  };
}

/** A command may finish silently, or hand back a prompt to send to the model. */
export interface CommandResult {
  submitPrompt?: string;
}

export interface SlashCommand {
  name: string;
  description: string;
  execute(args: string, ctx: CommandContext): Promise<CommandResult | void>;
}
