// packages/core/src/session/store.ts
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Message } from '../provider/types.js';

export interface SessionMeta {
  id: string;
  cwd: string;
  startedAt: string; // ISO timestamp
}

/** Stable, readable directory name for a project path. */
export function projectSlug(cwd: string): string {
  const base = path
    .basename(path.resolve(cwd))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  const hash = createHash('sha1')
    .update(path.resolve(cwd).toLowerCase())
    .digest('hex')
    .slice(0, 8);
  return `${base}-${hash}`;
}

export class SessionStore {
  readonly dir: string;

  constructor(cwd: string, baseDir?: string) {
    this.dir = path.join(
      baseDir ?? path.join(os.homedir(), '.minicode', 'sessions'),
      projectSlug(cwd),
    );
  }

  /** Start a new session file; returns its id. */
  async create(cwd: string): Promise<string> {
    const now = new Date();
    const stamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .slice(0, 15); // yyyymmdd-hhmmss
    const rand = Math.random().toString(36).slice(2, 6);
    const id = `${stamp}-${rand}`;
    const meta: SessionMeta = { id, cwd, startedAt: now.toISOString() };
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(
      this.file(id),
      JSON.stringify({ type: 'meta', meta }) + '\n',
      'utf8',
    );
    return id;
  }

  /** Append one message. JSONL means this is a cheap, atomic-enough write. */
  async append(id: string, message: Message): Promise<void> {
    await fs.appendFile(
      this.file(id),
      JSON.stringify({ type: 'message', message }) + '\n',
      'utf8',
    );
  }

  /** Load all messages of a session (skipping the meta line). */
  async load(id: string): Promise<Message[]> {
    const raw = await fs.readFile(this.file(id), 'utf8');
    const messages: Message[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      const record = JSON.parse(line) as
        | { type: 'meta'; meta: SessionMeta }
        | { type: 'message'; message: Message };
      if (record.type === 'message') messages.push(record.message);
    }
    return messages;
  }

  /** All sessions for this project, newest first. */
  async list(): Promise<SessionMeta[]> {
    let files: string[];
    try {
      files = (await fs.readdir(this.dir)).filter((f) => f.endsWith('.jsonl'));
    } catch {
      return [];
    }
    const metas: SessionMeta[] = [];
    for (const f of files) {
      const raw = await fs.readFile(path.join(this.dir, f), 'utf8');
      const firstLine = raw.slice(0, raw.indexOf('\n'));
      try {
        const record = JSON.parse(firstLine) as {
          type: string;
          meta: SessionMeta;
        };
        if (record.type === 'meta') metas.push(record.meta);
      } catch {
        // skip corrupt files
      }
    }
    return metas.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async latestId(): Promise<string | null> {
    const all = await this.list();
    return all[0]?.id ?? null;
  }

  private file(id: string): string {
    return path.join(this.dir, `${id}.jsonl`);
  }
}
