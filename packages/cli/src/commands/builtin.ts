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

export const providerCommand: SlashCommand = {
  name: 'provider',
  description: 'List profiles or switch: /provider [name]',
  async execute(args, ctx) {
    const name = args.trim();
    if (name.length === 0) {
      ctx.ui.addInfo(`Profiles: ${ctx.config.listProfiles().join(', ')}`);
      return;
    }
    try {
      const { provider, model, profileName } = ctx.config.createProvider(name);
      ctx.agent.setProvider(provider, model);
      ctx.ui.addInfo(`Switched to profile "${profileName}" (model: ${model})`);
    } catch (err) {
      ctx.ui.addInfo(`${err instanceof Error ? err.message : err}`);
    }
  },
};

export const resumeCommand: SlashCommand = {
  name: 'resume',
  description: 'List sessions for this project (restart with --resume <id>).',
  async execute(_args, ctx) {
    const sessions = await ctx.store.list();
    if (sessions.length === 0) {
      ctx.ui.addInfo('No saved sessions for this project yet.');
      return;
    }
    const lines = sessions
      .slice(0, 10)
      .map(
        (s) =>
          `${s.id === ctx.sessionId ? '→' : ' '} ${s.id}  (${s.startedAt})`,
      );
    ctx.ui.addInfo(
      [
        'Sessions (newest first):',
        ...lines,
        '',
        'Resume with: minicode --resume <id>',
      ].join('\n'),
    );
  },
};

export const agentsCommand: SlashCommand = {
  name: 'agents',
  description: 'List available sub-agent types.',
  async execute(_args, ctx) {
    const lines = [...ctx.definitions.values()].map(
      (d) =>
        `${d.name.padEnd(16)} ${d.description}\n${''.padEnd(16)} tools: ${(d.tools ?? ['(read-only defaults)']).join(', ')} · maxTurns: ${d.maxTurns ?? 10}`,
    );
    ctx.ui.addInfo(['Sub-agent types:', ...lines, '', 'Define more in .minicode\agents\*.md'].join('\n'));
  },
};

export const mcpCommand: SlashCommand = {
  name: 'mcp',
  description: 'List connected MCP servers and their tools.',
  async execute(_args, ctx) {
    if (ctx.mcpManagers.length === 0) {
      ctx.ui.addInfo(
        'No MCP servers connected. Add them under "mcpServers" in .minicode\settings.json.',
      );
      return;
    }
    const lines: string[] = [];
    for (const m of ctx.mcpManagers) {
      lines.push(`${m.name} — ${m.tools().length} tool(s):`);
      for (const t of m.tools()) {
        lines.push(`  ${t.name}`);
      }
    }
    ctx.ui.addInfo(lines.join('\n'));
  },
};
