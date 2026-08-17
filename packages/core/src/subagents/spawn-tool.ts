// packages/core/src/subagents/spawn-tool.ts
import { Agent } from '../agent/agent.js';
import { PermissionManager } from '../permissions/manager.js';
import type { ModelProvider } from '../provider/types.js';
import { ToolRegistry } from '../tools/registry.js';
import type { Tool, ToolResult } from '../tools/types.js';
import {
  DEFAULT_SUBAGENT_TOOLS,
  type AgentDefinition,
} from './definition.js';

export interface SpawnAgentDeps {
  /** Fresh provider per spawn (profiles can switch mid-session). */
  providerFactory: () => { provider: ModelProvider; model: string };
  /** The full registry, from which each subagent gets a filtered view. */
  baseTools: ToolRegistry;
  definitions: Map<string, AgentDefinition>;
}

const MAX_PARALLEL_TASKS = 4;

interface SpawnTask {
  agent: string;
  task: string;
}

export function createSpawnAgentTool(deps: SpawnAgentDeps): Tool {
  const roleList = [...deps.definitions.values()]
    .map((d) => `- "${d.name}": ${d.description}`)
    .join('\n');

  return {
    name: 'spawn_agent',
    description:
      'Delegate work to one or more sub-agents that run concurrently and ' +
      'return their final reports. Each task must be self-contained: the ' +
      'sub-agent sees nothing of this conversation. Available agent types:\n' +
      roleList,
    kind: 'execute',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: `1-${MAX_PARALLEL_TASKS} tasks to run concurrently.`,
          items: {
            type: 'object',
            properties: {
              agent: {
                type: 'string',
                description: 'Agent type name, e.g. "general".',
              },
              task: {
                type: 'string',
                description:
                  'Complete standalone instructions, including any file paths.',
              },
            },
            required: ['agent', 'task'],
          },
        },
      },
      required: ['tasks'],
    },
    async execute(args, ctx): Promise<ToolResult> {
      const tasks = (args['tasks'] as SpawnTask[] | undefined) ?? [];
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { llmContent: 'tasks must be a non-empty array.', isError: true };
      }
      if (tasks.length > MAX_PARALLEL_TASKS) {
        return {
          llmContent: `Too many tasks (${tasks.length}); max ${MAX_PARALLEL_TASKS} per call.`,
          isError: true,
        };
      }

      const reports = await Promise.all(
        tasks.map(async (t, i) => {
          const def = deps.definitions.get(t.agent);
          if (!def) {
            return `### Task ${i + 1} (${t.agent}) — FAILED\nUnknown agent type "${t.agent}". Known: ${[...deps.definitions.keys()].join(', ')}`;
          }
          try {
            const report = await runSubagent(deps, def, t.task, ctx.cwd);
            return `### Task ${i + 1} (${def.name})\n${report}`;
          } catch (err) {
            return `### Task ${i + 1} (${def.name}) — FAILED\n${
              err instanceof Error ? err.message : String(err)
            }`;
          }
        }),
      );

      return {
        llmContent: reports.join('\n\n'),
        displayText: `spawned ${tasks.length} agent(s): ${tasks
          .map((t) => t.agent)
          .join(', ')}`,
      };
    },
  };
}

async function runSubagent(
  deps: SpawnAgentDeps,
  def: AgentDefinition,
  task: string,
  cwd: string,
): Promise<string> {
  // Filtered registry: only the allowlisted tools, never spawn_agent itself.
  const allowed = def.tools ?? DEFAULT_SUBAGENT_TOOLS;
  const registry = new ToolRegistry();
  for (const name of allowed) {
    if (name === 'spawn_agent') continue; // no recursive spawning
    const tool = deps.baseTools.get(name);
    if (tool) registry.register(tool);
  }

  const { provider, model } = deps.providerFactory();
  const sub = new Agent({
    provider,
    model,
    tools: registry,
    cwd,
    systemPrompt: def.systemPrompt,
    maxTurns: def.maxTurns ?? 10,
    // Subagents have no human attached: run allowlisted tools without
    // prompting. The SAFETY is the allowlist, not the approval dialog —
    // only give a role tools you would auto-approve.
    permissions: new PermissionManager('yolo'),
  });

  let finalText = '';
  let toolCalls = 0;
  for await (const event of sub.run(task)) {
    if (event.type === 'text') finalText += event.text;
    else if (event.type === 'tool_start') {
      toolCalls++;
      finalText = ''; // only text AFTER the last tool call is the report
    } else if (event.type === 'error') {
      throw new Error(event.message);
    }
  }
  return `${finalText.trim()}\n\n(sub-agent used ${toolCalls} tool call(s))`;
}
