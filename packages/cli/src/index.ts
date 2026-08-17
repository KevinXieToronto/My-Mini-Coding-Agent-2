// packages/cli/src/index.ts
import { createElement } from 'react';
import { render } from 'ink';
import {
  Config,
  loadAgentDefinitions,
  loadMemory,
  loadSkills,
  McpManager,
  SessionStore,
  type AgentDefinition,
  type Message,
  type SkillDefinition,
} from '@minicode/core';
import { parseArgs } from './args.js';
import { App } from './ui/App.js';

const args = await parseArgs();

let config: Config;
let memory = '';
let resumedMessages: Message[] = [];
let definitions: Map<string, AgentDefinition> = new Map();
let skills: SkillDefinition[] = [];
const mcpManagers: McpManager[] = [];
const mcpErrors: string[] = [];
const store = new SessionStore(process.cwd());
let sessionId: string;

try {
  config = await Config.load(process.cwd(), args);
  config.createProvider(); // fail fast

  memory = await loadMemory(process.cwd());
  definitions = await loadAgentDefinitions(process.cwd());
  skills = await loadSkills(process.cwd());

  // A dead server must never take the CLI down — the native tools still work.
  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    try {
      mcpManagers.push(await McpManager.connect(name, serverConfig));
    } catch (err) {
      mcpErrors.push(
        `MCP server "${name}" failed to connect: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (args.resume !== undefined) {
    const id =
      args.resume === '' || args.resume === 'latest'
        ? await store.latestId()
        : args.resume;
    if (id === null) {
      console.error('No sessions to resume for this project.');
      process.exit(1);
    }
    resumedMessages = await store.load(id);
    sessionId = id; // continue appending to the same file
  } else {
    sessionId = await store.create(process.cwd());
  }
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

render(
  createElement(App, {
    config,
    memory,
    store,
    sessionId,
    resumedMessages,
    definitions,
    skills,
    mcpManagers,
    mcpErrors,
  }),
);
