// packages/cli/src/commands/index.ts
import { CommandRegistry } from './registry.js';
import {
  clearCommand,
  helpCommand,
  modelCommand,
  providerCommand,
  quitCommand,
  resumeCommand,
} from './builtin.js';

export * from './types.js';
export { CommandRegistry } from './registry.js';

export function createCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(helpCommand);
  registry.register(clearCommand);
  registry.register(modelCommand);
  registry.register(providerCommand);
  registry.register(resumeCommand);
  registry.register(quitCommand);
  registry.register({ ...quitCommand, name: 'exit' });
  return registry;
}
