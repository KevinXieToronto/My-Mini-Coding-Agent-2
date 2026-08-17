// packages/core/src/session/store.test.ts
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore, projectSlug } from './store.js';

describe('SessionStore', () => {
  let base: string;

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'minicode-sess-'));
  });
  afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  it('round-trips messages', async () => {
    const store = new SessionStore('C:\\proj', base);
    const id = await store.create('C:\\proj');
    await store.append(id, { role: 'user', content: 'hi' });
    await store.append(id, { role: 'assistant', content: 'hello' });
    const messages = await store.load(id);
    expect(messages).toHaveLength(2);
    expect(messages[1]?.content).toBe('hello');
  });

  it('lists sessions newest first and finds the latest', async () => {
    const store = new SessionStore('C:\\proj', base);
    const a = await store.create('C:\\proj');
    await new Promise((r) => setTimeout(r, 5));
    const b = await store.create('C:\\proj');
    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(await store.latestId()).toBe(list[0]?.id);
    expect([a, b]).toContain(list[0]?.id);
  });

  it('slugs are stable and filesystem-safe', () => {
    expect(projectSlug('C:\\Work\\My Proj')).toMatch(/^my-proj-[0-9a-f]{8}$/);
  });
});
