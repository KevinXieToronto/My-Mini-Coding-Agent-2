// packages/core/src/tools/index.ts
import { ToolRegistry } from './registry.js';
import { editFileTool } from './edit-file.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { listDirectoryTool } from './ls.js';
import { readFileTool } from './read-file.js';
import { runShellTool } from './shell.js';
import { saveMemoryTool } from './save-memory.js';
import { writeFileTool } from './write-file.js';

export * from './types.js';
export { ToolRegistry } from './registry.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(editFileTool);
  registry.register(listDirectoryTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(runShellTool);
  registry.register(saveMemoryTool);
  return registry;
}
