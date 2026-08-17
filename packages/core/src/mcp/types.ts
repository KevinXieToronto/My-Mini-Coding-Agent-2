// packages/core/src/mcp/types.ts

/** How to launch one MCP server (stdio transport). */
export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/** The `mcpServers` block of settings, keyed by server name. */
export type McpServerMap = Record<string, McpServerConfig>;

/** A tool as advertised by an MCP server's `tools/list`. */
export interface McpToolDefinition {
  name: string;
  description?: string;
  /** JSON Schema for the arguments, straight from the server. */
  inputSchema: Record<string, unknown>;
}

/** One content block of an MCP `tools/call` result. */
export interface McpContentBlock {
  type: string;
  /** Present when `type === 'text'`. */
  text?: string;
  [key: string]: unknown;
}

/** The payload of an MCP `tools/call` response. */
export interface McpCallToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

/**
 * A live connection to one MCP server. The client owns the child process;
 * `close()` must be called to shut it down.
 */
export interface McpConnection {
  serverName: string;
  listTools(): Promise<McpToolDefinition[]>;
  callTool(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<McpCallToolResult>;
  close(): Promise<void>;
}
