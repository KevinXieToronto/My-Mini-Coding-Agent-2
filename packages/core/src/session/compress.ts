// packages/core/src/session/compress.ts
import type { Message, ModelProvider } from '../provider/types.js';

/** Rough but serviceable: ~4 characters per token. */
export function estimateTokens(messages: Message[]): number {
  let chars = 0;
  for (const m of messages) {
    chars += m.content.length + 20;
    for (const c of m.toolCalls ?? []) chars += c.arguments.length + 40;
  }
  return Math.ceil(chars / 4);
}

const SUMMARY_PROMPT = `Summarize the conversation so far for your own future reference.
Include: the user's goals, decisions made, files created or changed (with paths),
important facts discovered, and any unfinished work. Be specific and terse.
Output only the summary.`;

/**
 * Replace everything between the system prompt and the last few messages
 * with a model-written summary. Returns a NEW history array.
 */
export async function compressHistory(
  provider: ModelProvider,
  model: string,
  history: Message[],
  keepLast = 6,
): Promise<Message[]> {
  const system = history[0];
  if (!system || system.role !== 'system') {
    throw new Error('history[0] must be the system message');
  }

  // Never cut between a tool call and its result: widen the kept tail
  // until it doesn't start with a 'tool' message.
  let cut = Math.max(1, history.length - keepLast);
  while (cut > 1 && history[cut]?.role === 'tool') cut--;

  const toSummarize = history.slice(1, cut);
  const tail = history.slice(cut);
  if (toSummarize.length === 0) return history;

  let summary = '';
  const stream = provider.chat(
    [...history.slice(0, cut), { role: 'user', content: SUMMARY_PROMPT }],
    { model },
  );
  for await (const event of stream) {
    if (event.type === 'text') summary += event.text;
  }

  return [
    system,
    {
      role: 'user',
      content: `[Conversation summary — earlier turns were compressed]\n${summary}`,
    },
    { role: 'assistant', content: 'Understood. Continuing from that summary.' },
    ...tail,
  ];
}
