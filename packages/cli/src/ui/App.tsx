// packages/cli/src/ui/App.tsx
import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { VERSION } from '@minicode/core';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import { InputBox } from './components/InputBox.js';
import { MessageList } from './components/MessageList.js';
import { useAgentRunner, type RunnerConfig } from './hooks/useAgentRunner.js';

export function App({ config }: { config: RunnerConfig }): React.JSX.Element {
  const { exit } = useApp();
  const runner = useAgentRunner(config);

  // Global keys: Ctrl+C exits (Ink also does this by default; explicit is nice).
  useInput((input, key) => {
    if (key.ctrl && input === 'c') exit();
  });

  const inputActive = !runner.running && runner.pendingConfirm === null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box borderStyle="round" borderColor="green" paddingX={1}>
        <Text>
          <Text color="green" bold>
            Mini Code
          </Text>{' '}
          v{VERSION} · {config.model} · {config.approvalMode} · {config.cwd}
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
        <InputBox
          active={inputActive}
          onSubmit={(value) => {
            if (value === 'exit' || value === 'quit') {
              exit();
              return;
            }
            runner.submit(value);
          }}
        />
        <Text dimColor>enter to send · ↑/↓ history · "exit" or ctrl+c to quit</Text>
      </Box>
    </Box>
  );
}
