// packages/cli/src/commands/builtin.ts
import type { SlashCommand } from './types.js';

export const helpCommand: SlashCommand = {
  name: 'help',
  description: 'List available commands.',
  async execute(_args, ctx) {
    const lines = ctx.commands
      .list()
      .map((c) => `/${c.name.padEnd(12)} ${c.description}`);
    ctx.ui.addInfo(
      ['Commands:', ...lines, '', '@path/to/file injects a file · !cmd runs a shell command'].join(
        '\n',
      ),
    );
  },
};

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the screen (history is kept).',
  async execute(_args, ctx) {
    ctx.ui.clear();
  },
};

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Show or switch the model: /model [name]',
  async execute(args, ctx) {
    const name = args.trim();
    if (name.length === 0) {
      ctx.ui.addInfo(`Current model: ${ctx.agent.model}`);
      return;
    }
    ctx.agent.setModel(name);
    ctx.ui.addInfo(`Model switched to: ${name}`);
  },
};

export const quitCommand: SlashCommand = {
  name: 'quit',
  description: 'Exit Mini Code (alias: /exit).',
  async execute(_args, ctx) {
    ctx.ui.exit();
  },
};
