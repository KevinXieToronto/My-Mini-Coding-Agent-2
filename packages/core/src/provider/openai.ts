// packages/core/src/provider/openai.ts
import OpenAI from 'openai';
import type {
  ChatOptions,
  Message,
  ModelProvider,
  StreamEvent,
  ToolCallRequest,
} from './types.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  /** e.g. https://api.openai.com/v1, https://dashscope.aliyuncs.com/compatible-mode/v1, http://localhost:11434/v1 */
  baseUrl?: string;
}

export class OpenAIProvider implements ModelProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
  }

  async *chat(
    messages: Message[],
    options: ChatOptions,
  ): AsyncGenerator<StreamEvent> {
    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: messages.map(toOpenAIMessage),
      temperature: options.temperature,
      tools: options.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      stream: true,
    });

    // Tool calls arrive as fragments spread across many chunks; we
    // accumulate them by index and emit once the stream ends.
    const pendingCalls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text', text: delta.content };
      }

      for (const tc of delta.tool_calls ?? []) {
        const entry = pendingCalls.get(tc.index) ?? {
          id: '',
          name: '',
          arguments: '',
        };
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name) entry.name += tc.function.name;
        if (tc.function?.arguments) entry.arguments += tc.function.arguments;
        pendingCalls.set(tc.index, entry);
      }
    }

    if (pendingCalls.size > 0) {
      const calls: ToolCallRequest[] = [...pendingCalls.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, c]) => ({ id: c.id, name: c.name, arguments: c.arguments }));
      yield { type: 'tool_calls', calls };
    }

    yield { type: 'done' };
  }
}

/** Translate our Message shape into the OpenAI wire format. */
function toOpenAIMessage(
  m: Message,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  switch (m.role) {
    case 'system':
      return { role: 'system', content: m.content };
    case 'user':
      return { role: 'user', content: m.content };
    case 'assistant':
      if (m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map((c) => ({
            id: c.id,
            type: 'function' as const,
            function: { name: c.name, arguments: c.arguments },
          })),
        };
      }
      return { role: 'assistant', content: m.content };
    case 'tool':
      return {
        role: 'tool',
        tool_call_id: m.toolCallId ?? '',
        content: m.content,
      };
  }
}
