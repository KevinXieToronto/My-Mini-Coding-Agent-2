// packages/cli/src/commands/index.ts
import { renderSkill, type SkillDefinition } from '@minicode/core';
import { CommandRegistry } from './registry.js';
import type { SlashCommand } from './types.js';
import {
  agentsCommand,
  clearCommand,
  helpCommand,
  mcpCommand,
  modelCommand,
  providerCommand,
  quitCommand,
  resumeCommand,
} from './builtin.js';

export * from './types.js';
export { CommandRegistry } from './registry.js';

export function createCommandRegistry(
  skills: SkillDefinition[] = [],
): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(helpCommand);
  registry.register(clearCommand);
  registry.register(modelCommand);
  registry.register(providerCommand);
  registry.register(resumeCommand);
  registry.register(agentsCommand);
  registry.register(mcpCommand);
  registry.register(quitCommand);
  registry.register({ ...quitCommand, name: 'exit' });

  for (const skill of skills) {
    registry.register(skillToCommand(skill));
  }
  registry.register(skillsListCommand(skills));
  return registry;
}

function skillToCommand(skill: SkillDefinition): SlashCommand {
  return {
    name: skill.name,
    description: `[skill] ${skill.description}`,
    async execute(args) {
      return { submitPrompt: renderSkill(skill, args) };
    },
  };
}

function skillsListCommand(skills: SkillDefinition[]): SlashCommand {
  return {
    name: 'skills',
    description: 'List available skills (from .minicode/skills/).',
    async execute(_args, ctx) {
      if (skills.length === 0) {
        ctx.ui.addInfo(
          'No skills found. Create .minicode\\skills\\<name>\\SKILL.md to add one.',
        );
        return;
      }
      const lines = skills.map((s) => `/${s.name.padEnd(12)} ${s.description}`);
      ctx.ui.addInfo(['Skills:', ...lines].join('\n'));
    },
  };
}
