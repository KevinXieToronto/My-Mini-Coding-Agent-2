// packages/core/src/index.test.ts
import { describe, expect, it } from 'vitest';
import { greet, VERSION } from './index.js';

describe('greet', () => {
  it('mentions the version and the name', () => {
    const message = greet('world');
    expect(message).toContain(VERSION);
    expect(message).toContain('world');
  });
});
