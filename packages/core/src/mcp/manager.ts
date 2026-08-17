// packages/core/src/mcp/manager.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool, ToolResult } from '../tools/types.js';
import type { McpServerConfig } from './types.js';

/** One connected MCP server and its tools, wrapped for our registry. */
export class McpManager {
  private constructor(
    readonly name: string,
    private client: Client,
    private wrapped: Tool[],
  ) {}

  /** Spawn the server, handshake, discover tools. Throws on any failure. */
  static async connect(
    name: string,
    config: McpServerConfig,
  ): Promise<McpManager> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: { ...getDefaultEnv(), ...config.env },
    });
    const client = new Client({ name: 'minicode', version: '0.1.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const wrapped = tools.map((t) =>
      wrapMcpTool(name, client, {
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema ?? { type: 'object' }) as Record<
          string,
          unknown
        >,
      }),
    );
    return new McpManager(name, client, wrapped);
  }

  tools(): Tool[] {
    return this.wrapped;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Adapt one MCP tool to our Tool interface. */
function wrapMcpTool(server: string, client: Client, info: McpToolInfo): Tool {
  return {
    // Namespaced so two servers with an "add" tool can't collide.
    name: `${server}__${info.name}`,
    description: `[MCP:${server}] ${info.description}`,
    parameters: info.inputSchema,
    // External code touching who-knows-what: never auto-run silently.
    kind: 'fetch',
    async execute(args): Promise<ToolResult> {
      const result = await client.callTool({
        name: info.name,
        arguments: args,
      });
      const parts = (result.content ?? []) as Array<{
        type: string;
        text?: string;
      }>;
      const text = parts
        .map((p) => (p.type === 'text' ? (p.text ?? '') : `[${p.type} content]`))
        .join('\n');
      return {
        llmContent: text || '(empty result)',
        displayText: `${server}:${info.name}`,
        isError: Boolean(result.isError),
      };
    },
  };
}

/** Pass a minimal, sane environment through to the child server. */
function getDefaultEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of [
    'PATH',
    'SYSTEMROOT',
    'APPDATA',
    'LOCALAPPDATA',
    'USERPROFILE',
    'TEMP',
    'HOME',
  ]) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}
