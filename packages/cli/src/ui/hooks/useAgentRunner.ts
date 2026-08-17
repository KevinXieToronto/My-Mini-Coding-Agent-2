// packages/cli/src/ui/hooks/useAgentRunner.ts
import { useCallback, useRef, useState } from 'react';
import {
  Agent,
  createDefaultRegistry,
  OpenAIProvider,
  PermissionManager,
  type ApprovalMode,
  type ConfirmationRequest,
  type ConfirmOutcome,
} from '@minicode/core';
import { nextId, type UIMessage } from '../types.js';

export interface RunnerConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  approvalMode: ApprovalMode;
  cwd: string;
}

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

export function useAgentRunner(cfg: RunnerConfig): AgentRunner {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<ConfirmationRequest | null>(null);
  const confirmResolver = useRef<((o: ConfirmOutcome) => void) | null>(null);

  // Create the agent exactly once, lazily, inside a ref.
  const agentRef = useRef<Agent | null>(null);
  if (agentRef.current === null) {
    agentRef.current = new Agent({
      provider: new OpenAIProvider({
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
      }),
      model: cfg.model,
      tools: createDefaultRegistry(),
      cwd: cfg.cwd,
      permissions: new PermissionManager(cfg.approvalMode),
      // The ConfirmFn: park a promise, surface the request as state,
      // resolve when the dialog answers.
      confirm: (req) =>
        new Promise<ConfirmOutcome>((resolve) => {
          confirmResolver.current = resolve;
          setPendingConfirm(req);
        }),
    });
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
