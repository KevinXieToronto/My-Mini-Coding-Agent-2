// packages/core/src/subagents/definition.ts

/** A reusable subagent role. */
export interface AgentDefinition {
  name: string;
  /** Shown to the MAIN model so it knows when to pick this role. */
  description: string;
  /** The subagent's own system prompt. */
  systemPrompt: string;
  /** Tool allowlist. Omitted -> safe read-only default set. */
  tools?: string[];
  maxTurns?: number;
}

/** Tools any subagent may use unless its definition says otherwise. */
export const DEFAULT_SUBAGENT_TOOLS = [
  'read_file',
  'list_directory',
  'glob',
  'grep',
];

export const GENERAL_AGENT: AgentDefinition = {
  name: 'general',
  description:
    'General-purpose helper for research and multi-step read-only tasks: ' +
    'finding code, reading files, summarizing, answering questions about the codebase.',
  systemPrompt: `You are a focused sub-agent working on one delegated task.
Do the task using your tools, then reply with your findings as plain text.
Your final message is your report to the main agent — make it complete and
self-contained, because it is the ONLY thing the main agent will see.
Do not ask questions; you cannot receive answers.`,
};
