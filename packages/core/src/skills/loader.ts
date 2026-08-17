// packages/core/src/skills/loader.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseFrontmatterDoc } from '../subagents/loader.js';

export interface SkillDefinition {
  name: string;
  description: string;
  /** The prompt body; may contain $ARGUMENTS. */
  template: string;
}

/** Load every .minicode/skills/<name>/SKILL.md under cwd. */
export async function loadSkills(cwd: string): Promise<SkillDefinition[]> {
  const dir = path.join(cwd, '.minicode', 'skills');
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const skills: SkillDefinition[] = [];
  for (const name of entries) {
    let raw: string;
    try {
      raw = await fs.readFile(path.join(dir, name, 'SKILL.md'), 'utf8');
    } catch {
      continue; // folder without SKILL.md — ignore
    }
    const { fields, body } = parseFrontmatterDoc(raw);
    if (body.length === 0) continue;
    skills.push({
      name: fields['name'] ?? name,
      description: fields['description'] ?? `Skill from ${name}/SKILL.md`,
      template: body,
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Substitute the user's arguments into the template. */
export function renderSkill(skill: SkillDefinition, args: string): string {
  const trimmed = args.trim();
  if (skill.template.includes('$ARGUMENTS')) {
    return skill.template.replaceAll('$ARGUMENTS', trimmed);
  }
  // No placeholder: append args so they're never silently dropped.
  return trimmed.length > 0 ? `${skill.template}\n\n${trimmed}` : skill.template;
}
