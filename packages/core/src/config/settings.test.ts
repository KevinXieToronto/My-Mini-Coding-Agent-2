// packages/core/src/config/settings.test.ts
import { describe, expect, it } from 'vitest';
import { mergeSettings } from './settings.js';

describe('mergeSettings', () => {
  it('later layers win on scalars', () => {
    const merged = mergeSettings(
      { model: 'a', approvalMode: 'ask' },
      { model: 'b' },
    );
    expect(merged.model).toBe('b');
    expect(merged.approvalMode).toBe('ask');
  });

  it('merges provider maps by key', () => {
    const merged = mergeSettings(
      {
        providers: {
          ollama: { protocol: 'openai', model: 'qwen3' },
          openai: { protocol: 'openai', model: 'gpt-4o-mini' },
        },
      },
      {
        providers: {
          ollama: {
            protocol: 'openai',
            baseUrl: 'http://localhost:11434/v1',
            model: 'qwen3',
          },
        },
      },
    );
    expect(Object.keys(merged.providers ?? {})).toHaveLength(2);
    expect(merged.providers?.['ollama']?.baseUrl).toContain('11434');
  });
});
