// packages/cli/src/input/completion.test.ts
import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './completion.js';

describe('fuzzyMatch', () => {
  it('matches subsequences', () => {
    expect(fuzzyMatch('uhar', 'ui/hooks/useAgentRunner.ts')).toBe(true);
    expect(fuzzyMatch('app', 'ui/App.tsx')).toBe(true);
  });
  it('rejects out-of-order characters', () => {
    expect(fuzzyMatch('xz', 'ui/App.tsx')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(fuzzyMatch('APP', 'ui/app.tsx')).toBe(true);
  });
});
