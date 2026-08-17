// packages/core/src/subagents/loader.test.ts
import { describe, expect, it } from 'vitest';
import { parseFrontmatterDoc } from './loader.js';

describe('parseFrontmatterDoc', () => {
  it('splits frontmatter fields from the body', () => {
    const { fields, body } = parseFrontmatterDoc(
      '---\nname: reviewer\ntools: read_file, grep\n---\nYou review code.',
    );
    expect(fields['name']).toBe('reviewer');
    expect(fields['tools']).toBe('read_file, grep');
    expect(body).toBe('You review code.');
  });

  it('treats a file without frontmatter as pure body', () => {
    const { fields, body } = parseFrontmatterDoc('Just a prompt.');
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toBe('Just a prompt.');
  });
});
