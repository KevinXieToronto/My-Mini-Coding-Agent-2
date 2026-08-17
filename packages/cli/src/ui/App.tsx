// packages/cli/src/ui/App.tsx
import { useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import {
  VERSION,
  type AgentDefinition,
  type Config,
  type McpManager,
  type Message,
  type SessionStore,
  type SkillDefinition,
} from '@minicode/core';
import { createCommandRegistry, type CommandContext } from '../commands/index.js';
import { expandAtFiles } from '../input/atFile.js';
import { completeAtToken } from '../input/completion.js';
import { runShellPassthrough } from '../input/shellPassthrough.js';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import { InputBox } from './components/InputBox.js';
import { MessageList } from './components/MessageList.js';
import { useAgentRunner } from './hooks/useAgentRunner.js';

export interface AppProps {
  config: Config;
  memory: string;
  store: SessionStore;
  sessionId: string;
  resumedMessages: Message[];
  definitions: Map<string, AgentDefinition>;
  skills: SkillDefinition[];
  mcpManagers: McpManager[];
  mcpErrors: string[];
}

export function App({
  config,
  memory,
  store,
  sessionId,
  resumedMessages,
  definitions,
  skills,
  mcpManagers,
  mcpErrors,
}: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const runner = useAgentRunner(
    config,
    memory,
    store,
    sessionId,
    resumedMessages,
    definitions,
    mcpManagers,
  );
  const commandsRef = useRef(createCommandRegistry(skills));
  const lastShellOutput = useRef<string | null>(null);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') exit();
  });

  useEffect(() => {
    for (const e of mcpErrors) runner.addInfo(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(
    (value: string) => {
      void (async () => {
        // 1. Slash commands — handled locally.
        if (value.startsWith('/')) {
          const space = value.indexOf(' ');
          const name = (space === -1 ? value.slice(1) : value.slice(1, space)).toLowerCase();
          const args = space === -1 ? '' : value.slice(space + 1);
          const cmd = commandsRef.current.get(name);
          if (!cmd) {
            runner.addInfo(`Unknown command: /${name} — try /help`);
            return;
          }
          const ctx: CommandContext = {
            agent: runner.agent,
            commands: commandsRef.current,
            config,
            store,
            sessionId,
            definitions,
            mcpManagers,
            ui: { addInfo: runner.addInfo, clear: runner.clear, exit },
          };
          const result = await cmd.execute(args, ctx);
          if (result?.submitPrompt) {
            runner.submit(result.submitPrompt, value);
          }
          return;
        }

        // 2. !shell passthrough — run it ourselves, remember the output.
        if (value.startsWith('!')) {
          const command = value.slice(1).trim();
          if (command.length === 0) return;
          runner.addInfo(`$ ${command}`);
          const output = await runShellPassthrough(command, config.cwd);
          runner.addInfo(output);
          lastShellOutput.current = `$ ${command}\n${output}`;
          return;
        }

        // 3. Normal prompt: expand @files, attach remembered shell output.
        const { prompt, injected } = await expandAtFiles(value, config.cwd);
        let finalPrompt = prompt;
        if (lastShellOutput.current !== null) {
          finalPrompt = `Output of a command I just ran:\n\`\`\`\n${lastShellOutput.current}\n\`\`\`\n\n${finalPrompt}`;
          lastShellOutput.current = null;
        }
        if (injected.length > 0) {
          runner.addInfo(`injected: ${injected.join(', ')}`);
        }
        runner.submit(finalPrompt, value);
      })();
    },
    [runner, exit, config, store, sessionId, definitions, mcpManagers],
  );

  const complete = useCallback(
    async (value: string): Promise<string | null> => {
      const at = value.lastIndexOf('@');
      if (at === -1) return null;
      const partial = value.slice(at + 1);
      if (/\s/.test(partial)) return null;
      const candidates = await completeAtToken(partial, config.cwd);
      const first = candidates[0];
      if (first === undefined) return null;
      return value.slice(0, at + 1) + first;
    },
    [config.cwd],
  );

  const inputActive = !runner.running && runner.pendingConfirm === null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box borderStyle="round" borderColor="green" paddingX={1}>
        <Text>
          <Text color="green" bold>
            Mini Code
          </Text>{' '}
          v{VERSION} · {runner.agent.model} · {config.approvalMode} ·{' '}
          {config.cwd}
        </Text>
      </Box>

      <MessageList messages={runner.messages} />

      {runner.pendingConfirm ? (
        <ConfirmDialog
          request={runner.pendingConfirm}
          onRespond={runner.respondConfirm}
        />
      ) : null}

      {runner.running && runner.pendingConfirm === null ? (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" /> thinking…
          </Text>
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <InputBox active={inputActive} onSubmit={handleSubmit} complete={complete} />
        <Text dimColor>
          /help · @file (tab completes) · !shell · ↑/↓ history · ctrl+c quits
        </Text>
      </Box>
    </Box>
  );
}
