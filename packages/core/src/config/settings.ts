// packages/core/src/config/settings.ts
import * as fs from 'node:fs/promises';
import type { ApprovalMode } from '../permissions/types.js';
import type { HooksConfig } from '../hooks/types.js';

/** One way of reaching a model. All profiles here speak the OpenAI protocol. */
export interface ProviderProfile {
  /** Only 'openai' is implemented; the field exists so adapters can slot in. */
  protocol: 'openai';
  baseUrl?: string;
  /** Inline key (fine for local endpoints) … */
  apiKey?: string;
  /** …or the name of an env var that holds it (right for real keys). */
  apiKeyEnv?: string;
  model: string;
}

export interface Settings {
  /** Default model when the profile doesn't decide it. */
  model?: string;
  /** Name of the profile to use, from `providers`. */
  provider?: string;
  approvalMode?: ApprovalMode;
  providers?: Record<string, ProviderProfile>;
  hooks?: HooksConfig;
}

/** Read one settings.json; missing file → {}, malformed file → loud error. */
export async function loadSettingsFile(path: string): Promise<Settings> {
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf8');
  } catch {
    return {};
  }
  try {
    return JSON.parse(raw) as Settings;
  } catch (e) {
    throw new Error(
      `Malformed JSON in ${path}: ${e instanceof Error ? e.message : e}`,
    );
  }
}

/** Later arguments win. Scalars overwrite; `providers` maps merge by key. */
export function mergeSettings(...layers: Settings[]): Settings {
  const result: Settings = {};
  for (const layer of layers) {
    if (layer.model !== undefined) result.model = layer.model;
    if (layer.provider !== undefined) result.provider = layer.provider;
    if (layer.approvalMode !== undefined)
      result.approvalMode = layer.approvalMode;
    if (layer.hooks !== undefined) result.hooks = layer.hooks;
    if (layer.providers) {
      result.providers = { ...result.providers, ...layer.providers };
    }
  }
  return result;
}
