// packages/core/src/subagents/loader.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  GENERAL_AGENT,
  type AgentDefinition,
} from './definition.js';

/** Minimal frontmatter parser: `key: value` lines between --- fences. */
export function parseFrontmatterDoc(raw: string): {
  fields: Record<string, string>;
  body: string;
} {
  const fields: Record<string, string> = {};
  if (!raw.startsWith('---')) return { fields, body: raw.trim() };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fields, body: raw.trim() };

  const header = raw.slice(3, end).trim();
  const body = raw.slice(raw.indexOf('\n', end + 1) + 1).trim();
  for (const line of header.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) fields[key] = value;
  }
  return { fields, body };
}

/** Built-in roles + every .minicode/agents/*.md in the project. */
export async function loadAgentDefinitions(
  cwd: string,
): Promise<Map<string, AgentDefinition>> {
  const definitions = new Map<string, AgentDefinition>();
  definitions.set(GENERAL_AGENT.name, GENERAL_AGENT);

  const dir = path.join(cwd, '.minicode', 'agents');
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return definitions; // no custom agents — fine
  }

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    const { fields, body } = parseFrontmatterDoc(raw);
    const name = fields['name'] ?? path.basename(file, '.md');
    if (body.length === 0) continue;
    const def: AgentDefinition = {
      name,
      description: fields['description'] ?? `Custom agent from ${file}`,
      systemPrompt: body,
    };
    if (fields['tools']) {
      def.tools = fields['tools'].split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (fields['maxTurns']) {
      const n = Number(fields['maxTurns']);
      if (Number.isFinite(n) && n > 0) def.maxTurns = n;
    }
    definitions.set(name, def); // project file can override a built-in
  }
  return definitions;
}
