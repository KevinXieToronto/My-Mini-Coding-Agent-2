// packages/core/src/index.ts
export const VERSION = '0.1.0';

export * from './provider/types.js';
export { OpenAIProvider } from './provider/openai.js';
export type { OpenAIProviderOptions } from './provider/openai.js';
export { buildSystemPrompt } from './prompts.js';

export * from './tools/index.js';
export type { AgentEvent } from './agent/events.js';
export { Agent } from './agent/agent.js';
export type { AgentOptions } from './agent/agent.js';

export * from './permissions/types.js';
export { PermissionManager } from './permissions/manager.js';

export * from './config/settings.js';
export { Config } from './config/config.js';
export type { CliOverrides } from './config/config.js';

export { SessionStore, projectSlug } from './session/store.js';
export type { SessionMeta } from './session/store.js';
export { compressHistory, estimateTokens } from './session/compress.js';
export { loadMemory, appendMemory, MEMORY_FILENAME } from './memory/memory.js';

export * from './subagents/definition.js';
export { loadAgentDefinitions, parseFrontmatterDoc } from './subagents/loader.js';
export { createSpawnAgentTool } from './subagents/spawn-tool.js';
export type { SpawnAgentDeps } from './subagents/spawn-tool.js';

export * from './skills/loader.js';
export * from './hooks/types.js';
export { HookRunner } from './hooks/runner.js';
