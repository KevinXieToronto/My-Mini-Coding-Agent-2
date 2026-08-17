// packages/cli/src/input/atFile.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const AT_TOKEN = /@([\w\-./\\]+)/g;
const MAX_FILE_CHARS = 50_000;

export interface AtExpansion {
  /** The prompt to send: original text + appended file contents. */
  prompt: string;
  /** Which paths were injected (for the UI to report). */
  injected: string[];
}

/**
 * Find @path tokens that name real files under cwd and append their
 * contents to the prompt as fenced blocks. Tokens that don't resolve
 * to a file are left untouched (could be an email, a decorator, …).
 */
export async function expandAtFiles(
  input: string,
  cwd: string,
): Promise<AtExpansion> {
  const injected: string[] = [];
  const sections: string[] = [];

  for (const match of input.matchAll(AT_TOKEN)) {
    const rel = match[1];
    if (rel === undefined) continue;
    const abs = path.resolve(cwd, rel);
    if (!abs.startsWith(path.resolve(cwd))) continue; // stay inside cwd
    let stat;
    try {
      stat = await fs.stat(abs);
    } catch {
      continue; // not a file — leave the token alone
    }
    if (!stat.isFile()) continue;

    let text = await fs.readFile(abs, 'utf8');
    if (text.length > MAX_FILE_CHARS) {
      text = text.slice(0, MAX_FILE_CHARS) + '\n[...truncated]';
    }
    injected.push(rel);
    sections.push(`Contents of ${rel}:\n\`\`\`\n${text}\n\`\`\``);
  }

  if (sections.length === 0) return { prompt: input, injected };
  return { prompt: `${input}\n\n${sections.join('\n\n')}`, injected };
}
