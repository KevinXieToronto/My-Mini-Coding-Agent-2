// packages/core/src/provider/openai.test.ts
import { describe, expect, it } from 'vitest';
import { OpenAIProvider } from './openai.js';

describe('OpenAIProvider', () => {
  it('constructs with a base URL override', () => {
    const p = new OpenAIProvider({
      apiKey: 'test',
      baseUrl: 'http://localhost:11434/v1',
    });
    expect(p.name).toBe('openai');
  });
});
