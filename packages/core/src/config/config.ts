// packages/core/src/config/config.ts
import * as os from 'node:os';
import * as path from 'node:path';
import type { ApprovalMode } from '../permissions/types.js';
import type { HooksConfig } from '../hooks/types.js';
import { OpenAIProvider } from '../provider/openai.js';
import type { ModelProvider } from '../provider/types.js';
import {
  loadSettingsFile,
  mergeSettings,
  type ProviderProfile,
  type Settings,
} from './settings.js';

/** What the CLI's argument parser hands us (the top precedence layer). */
export interface CliOverrides {
  model?: string;
  provider?: string;
  approvalMode?: ApprovalMode;
}

const DEFAULTS: Settings = {
  provider: 'default',
  approvalMode: 'ask',
};

export class Config {
  private constructor(
    readonly cwd: string,
    readonly settings: Settings,
  ) {}

  static async load(cwd: string, cli: CliOverrides = {}): Promise<Config> {
    const userFile = path.join(os.homedir(), '.minicode', 'settings.json');
    const projectFile = path.join(cwd, '.minicode', 'settings.json');

    // Env layer: expressed as a Settings fragment so it merges like the rest.
    const env: Settings = {};
    if (process.env['MINICODE_MODEL']) {
      env.model = process.env['MINICODE_MODEL'];
    }

    // The 'default' profile mirrors tutorial 02's env-var configuration,
    // so everything keeps working with zero settings files on disk.
    const builtin: Settings = {
      providers: {
        default: {
          protocol: 'openai',
          apiKeyEnv: 'OPENAI_API_KEY',
          baseUrl: process.env['OPENAI_BASE_URL'],
          model: 'gpt-4o-mini',
        },
      },
    };

    const cliLayer: Settings = {};
    if (cli.model !== undefined) cliLayer.model = cli.model;
    if (cli.provider !== undefined) cliLayer.provider = cli.provider;
    if (cli.approvalMode !== undefined)
      cliLayer.approvalMode = cli.approvalMode;

    const settings = mergeSettings(
      DEFAULTS,
      builtin,
      await loadSettingsFile(userFile), // user
      await loadSettingsFile(projectFile), // project (beats user)
      env, // env (beats files)
      cliLayer, // CLI (beats everything)
    );
    return new Config(cwd, settings);
  }

  get approvalMode(): ApprovalMode {
    return this.settings.approvalMode ?? 'ask';
  }

  get hooks(): HooksConfig {
    return this.settings.hooks ?? {};
  }

  listProfiles(): string[] {
    return Object.keys(this.settings.providers ?? {}).sort();
  }

  /** Resolve a profile (by name, or the configured one) into a live provider. */
  createProvider(profileName?: string): {
    provider: ModelProvider;
    model: string;
    profileName: string;
  } {
    const name = profileName ?? this.settings.provider ?? 'default';
    const profile: ProviderProfile | undefined =
      this.settings.providers?.[name];
    if (!profile) {
      throw new Error(
        `Unknown provider profile: ${name}. Known: ${this.listProfiles().join(', ')}`,
      );
    }

    const apiKey =
      profile.apiKey ?? process.env[profile.apiKeyEnv ?? 'OPENAI_API_KEY'] ?? '';
    if (apiKey === '') {
      throw new Error(
        `No API key for profile "${name}" — set ${profile.apiKeyEnv ?? 'OPENAI_API_KEY'} ` +
          `or add "apiKey" to the profile.`,
      );
    }

    // The protocol switch: today only 'openai' exists. An Anthropic or
    // Gemini adapter would be one more case here — and nothing else in
    // the entire codebase would change.
    switch (profile.protocol) {
      case 'openai':
        return {
          provider: new OpenAIProvider({ apiKey, baseUrl: profile.baseUrl }),
          model: this.settings.model ?? profile.model,
          profileName: name,
        };
    }
  }
}
