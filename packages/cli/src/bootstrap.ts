// packages/cli/src/bootstrap.ts
import {
  Agent,
  Config,
  createDefaultRegistry,
  createSpawnAgentTool,
  HookRunner,
  loadAgentDefinitions,
  loadMemory,
  loadSkills,
  McpManager,
  PermissionManager,
  type AgentDefinition,
  type ConfirmFn,
  type Message,
  type SkillDefinition,
} from '@minicode/core';
import type { CliArgs } from './args.js';

export interface Bootstrap {
  config: Config;
  memory: string;
  definitions: Map<string, AgentDefinition>;
  skills: SkillDefinition[];
  mcpManagers: McpManager[];
  mcpErrors: string[];
}

/** Everything every frontend needs, loaded once. */
export async function bootstrap(cwd: string, args: CliArgs): Promise<Bootstrap> {
  const config = await Config.load(cwd, args);
  config.createProvider(); // fail fast

  const memory = await loadMemory(cwd);
  const definitions = await loadAgentDefinitions(cwd);
  const skills = await loadSkills(cwd);

  const mcpManagers: McpManager[] = [];
  const mcpErrors: string[] = [];
  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    try {
      mcpManagers.push(await McpManager.connect(name, serverConfig));
    } catch (err) {
      mcpErrors.push(
        `MCP server "${name}" failed to connect: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return { config, memory, definitions, skills, mcpManagers, mcpErrors };
}

export interface BuildAgentOptions {
  boot: Bootstrap;
  confirm?: ConfirmFn;
  onMessage?: (message: Message) => void;
  resumedMessages?: Message[];
}

/** Assemble a fully-armed Agent from a Bootstrap. */
export function buildAgent(options: BuildAgentOptions): Agent {
  const { boot } = options;
  const tools = createDefaultRegistry();
  tools.register(
    createSpawnAgentTool({
      providerFactory: () => boot.config.createProvider(),
      baseTools: tools,
      definitions: boot.definitions,
    }),
  );
  for (const manager of boot.mcpManagers) {
    for (const tool of manager.tools()) tools.register(tool);
  }

  const { provider, model } = boot.config.createProvider();
  const agent = new Agent({
    provider,
    model,
    tools,
    cwd: boot.config.cwd,
    permissions: new PermissionManager(boot.config.approvalMode),
    memory: boot.memory,
    hooks: new HookRunner(boot.config.hooks, boot.config.cwd),
    confirm: options.confirm,
    onMessage: options.onMessage,
  });
  if (options.resumedMessages) agent.loadHistory(options.resumedMessages);
  return agent;
}
