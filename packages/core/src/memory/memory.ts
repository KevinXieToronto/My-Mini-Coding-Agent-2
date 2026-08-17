// packages/core/src/memory/memory.ts
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export const MEMORY_FILENAME = 'MINICODE.md';

async function readIfExists(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Global memory (~/.minicode/MINICODE.md) + project memory (<cwd>/MINICODE.md),
 * concatenated for the system prompt. Either may be missing.
 */
export async function loadMemory(cwd: string): Promise<string> {
  const globalMem = await readIfExists(
    path.join(os.homedir(), '.minicode', MEMORY_FILENAME),
  );
  const projectMem = await readIfExists(path.join(cwd, MEMORY_FILENAME));
  const parts: string[] = [];
  if (globalMem) parts.push(`# Global memory\n${globalMem.trim()}`);
  if (projectMem) {
    parts.push(`# Project memory (${MEMORY_FILENAME})\n${projectMem.trim()}`);
  }
  return parts.join('\n\n');
}

const MEMORY_HEADING = '## Memories';

/** Append one fact as a bullet under "## Memories" in the project file. */
export async function appendMemory(cwd: string, fact: string): Promise<string> {
  const file = path.join(cwd, MEMORY_FILENAME);
  let text =
    (await readIfExists(file)) ??
    `# Project notes for Mini Code\n\n${MEMORY_HEADING}\n`;
  if (!text.includes(MEMORY_HEADING)) {
    text = `${text.trimEnd()}\n\n${MEMORY_HEADING}\n`;
  }
  text = `${text.trimEnd()}\n- ${fact.trim()}\n`;
  await fs.writeFile(file, text, 'utf8');
  return file;
}
