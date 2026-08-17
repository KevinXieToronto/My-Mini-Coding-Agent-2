// packages/core/src/tools/paths.test.ts
import { describe, expect, it } from 'vitest';
import { resolveInCwd } from './paths.js';

describe('resolveInCwd', () => {
  it('resolves relative paths inside cwd', () => {
    expect(resolveInCwd('C:\\proj', 'src\\a.ts')).toContain('proj');
  });
  it('blocks escaping with ..', () => {
    expect(() => resolveInCwd('C:\\proj', '..\\outside.txt')).toThrow(
      /escapes/,
    );
  });
  it('blocks absolute paths outside cwd', () => {
    expect(() => resolveInCwd('C:\\proj', 'C:\\Windows\\a.txt')).toThrow(
      /escapes/,
    );
  });
});
