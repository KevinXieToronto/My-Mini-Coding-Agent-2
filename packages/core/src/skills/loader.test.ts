// packages/core/src/skills/loader.test.ts
import { describe, expect, it } from 'vitest';
import { renderSkill } from './loader.js';

describe('renderSkill', () => {
  it('substitutes $ARGUMENTS everywhere', () => {
    const out = renderSkill(
      { name: 'x', description: '', template: 'Review $ARGUMENTS. Focus: $ARGUMENTS.' },
      'src/app.ts',
    );
    expect(out).toBe('Review src/app.ts. Focus: src/app.ts.');
  });

  it('appends args when the template has no placeholder', () => {
    const out = renderSkill(
      { name: 'x', description: '', template: 'Do the thing.' },
      'extra context',
    );
    expect(out).toBe('Do the thing.\n\nextra context');
  });
});
