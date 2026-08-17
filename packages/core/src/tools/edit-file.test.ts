// packages/core/src/tools/edit-file.test.ts
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editFileTool } from './edit-file.js';

describe('edit_file', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'minicode-test-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('replaces a unique string', async () => {
    const file = path.join(dir, 'a.txt');
    await fs.writeFile(file, 'hello old world', 'utf8');
    const result = await editFileTool.execute(
      { path: 'a.txt', old_string: 'old', new_string: 'new' },
      { cwd: dir },
    );
    expect(result.isError).toBeFalsy();
    expect(await fs.readFile(file, 'utf8')).toBe('hello new world');
  });

  it('rejects a non-unique old_string', async () => {
    await fs.writeFile(path.join(dir, 'a.txt'), 'aa aa', 'utf8');
    const result = await editFileTool.execute(
      { path: 'a.txt', old_string: 'aa', new_string: 'bb' },
      { cwd: dir },
    );
    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('more than once');
  });

  it('rejects a missing old_string with a helpful message', async () => {
    await fs.writeFile(path.join(dir, 'a.txt'), 'hello', 'utf8');
    const result = await editFileTool.execute(
      { path: 'a.txt', old_string: 'nope', new_string: 'x' },
      { cwd: dir },
    );
    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('not found');
  });

  it('previews the change as a unified diff without applying it', async () => {
    const file = path.join(dir, 'a.txt');
    await fs.writeFile(file, 'line one\nline two\n', 'utf8');
    const diff = await editFileTool.preview!(
      { path: 'a.txt', old_string: 'line two', new_string: 'line 2' },
      { cwd: dir },
    );
    expect(diff).toContain('-line two');
    expect(diff).toContain('+line 2');
    // preview must not modify the file
    expect(await fs.readFile(file, 'utf8')).toBe('line one\nline two\n');
  });
});
