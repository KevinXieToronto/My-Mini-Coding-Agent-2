// packages/cli/src/commands/registry.ts
import type { SlashCommand } from './types.js';

export class CommandRegistry {
  private commands = new Map<string, SlashCommand>();

  register(cmd: SlashCommand): void {
    this.commands.set(cmd.name, cmd);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  list(): SlashCommand[] {
    return [...this.commands.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}
