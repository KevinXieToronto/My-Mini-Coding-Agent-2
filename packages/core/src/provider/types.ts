// packages/core/src/provider/types.ts

/** A single tool invocation requested by the model (used from tutorial 03 on). */
export interface ToolCallRequest {
  /** Provider-assigned id, echoed back in the tool result message. */
  id: string;
  /** Tool name, e.g. "read_file". */
  name: string;
  /** Raw JSON string of arguments, exactly as the model produced it. */
  arguments: string;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** One entry in the conversation history. */
export interface Message {
  role: MessageRole;
  content: string;
  /** Present on assistant messages that request tool calls. */
  toolCalls?: ToolCallRequest[];
  /** Present on 'tool' messages: which call this is the result of. */
  toolCallId?: string;
}

/** JSON-Schema description of a tool, sent to the model (tutorial 03). */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ChatOptions {
  model: string;
  tools?: ToolSchema[];
  temperature?: number;
}

/** What a provider yields while streaming a response. */
export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_calls'; calls: ToolCallRequest[] }
  | { type: 'done' };

/** The contract every model backend implements. */
export interface ModelProvider {
  readonly name: string;
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamEvent>;
}
