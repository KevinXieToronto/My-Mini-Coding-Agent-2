// packages/cli/src/ui/hooks/useAgentRunner.ts
import { useCallback, useRef, useState } from 'react';
import {
  Agent,
  Config,
  createDefaultRegistry,
  PermissionManager,
  type ConfirmationRequest,
  type ConfirmOutcome,
  type Message,
  type SessionStore,
} from '@minicode/core';
import { nextId, type UIMessage } from '../types.js';

export interface AgentRunner {
  agent: Agent;
  messages: UIMessage[];
  running: boolean;
  pendingConfirm: ConfirmationRequest | null;
  submit(prompt: string, display?: string): void;
  respondConfirm(outcome: ConfirmOutcome): void;
  addInfo(text: string): void;
  clear(): void;
}

export function useAgentRunner(
  config: Config,
  memory: string,
  store: SessionStore,
  sessionId: string,
  resumedMessages: Message[],
): AgentRunner {
  const [messages, setMessages] = useState<UIMessage[]>(() =>
    resumedMessages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({
        id: nextId(),
        role: m.role as 'user' | 'assistant',
        text: m.content,
      })),
  );
  const [running, setRunning] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<ConfirmationRequest | null>(null);
  const confirmResolver = useRef<((o: ConfirmOutcome) => void) | null>(null);

  // Create the agent exactly once, lazily, inside a ref.
  const agentRef = useRef<Agent | null>(null);
  if (agentRef.current === null) {
    const { provider, model } = config.createProvider();
    const agent = new Agent({
      provider,
      model,
      tools: createDefaultRegistry(),
      cwd: config.cwd,
      permissions: new PermissionManager(config.approvalMode),
      memory,
      onMessage: (m) => void store.append(sessionId, m),
      // The ConfirmFn: park a promise, surface the request as state,
      // resolve when the dialog answers.
      confirm: (req) =>
        new Promise<ConfirmOutcome>((resolve) => {
          confirmResolver.current = resolve;
          setPendingConfirm(req);
        }),
    });
    agent.loadHistory(resumedMessages);
    agentRef.current = agent;
  }

  const respondConfirm = useCallback((outcome: ConfirmOutcome) => {
    setPendingConfirm(null);
    confirmResolver.current?.(outcome);
    confirmResolver.current = null;
  }, []);

  const addInfo = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'info', text }]);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  const submit = useCallback((prompt: string, display?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: display ?? prompt },
    ]);
    setRunning(true);

    void (async () => {
      const agent = agentRef.current;
      if (!agent) return;
      let assistantId: string | null = null;

      for await (const event of agent.run(prompt)) {
        switch (event.type) {
          case 'text': {
            if (assistantId === null) {
              const id = nextId();
              assistantId = id;
              setMessages((prev) => [
                ...prev,
                { id, role: 'assistant', text: event.text },
              ]);
            } else {
              const id = assistantId;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, text: m.text + event.text } : m,
                ),
              );
            }
            break;
          }
          case 'tool_start': {
            assistantId = null;
            setMessages((prev) => [
              ...prev,
              {
                id: event.call.id || nextId(),
                role: 'tool',
                toolName: event.call.name,
                text: event.call.name,
                status: 'running',
              },
            ]);
            break;
          }
          case 'tool_end': {
            const label = event.result.displayText ?? event.call.name;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === event.call.id
                  ? {
                      ...m,
                      text: label,
                      status: event.result.isError ? 'error' : 'ok',
                    }
                  : m,
              ),
            );
            break;
          }
          case 'info': {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'info', text: event.message },
            ]);
            break;
          }
          case 'error': {
            assistantId = null;
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'info', text: `error: ${event.message}` },
            ]);
            break;
          }
          case 'turn_end':
            break;
        }
      }
      setRunning(false);
    })();
  }, []);

  return {
    agent: agentRef.current,
    messages,
    running,
    pendingConfirm,
    submit,
    respondConfirm,
    addInfo,
    clear,
  };
}
