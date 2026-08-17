// packages/core/src/index.ts
export const VERSION = '0.1.0';

export * from './provider/types.js';
export { OpenAIProvider } from './provider/openai.js';
export type { OpenAIProviderOptions } from './provider/openai.js';
export { buildSystemPrompt } from './prompts.js';
