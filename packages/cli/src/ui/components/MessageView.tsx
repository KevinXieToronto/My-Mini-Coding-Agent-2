// packages/cli/src/ui/components/MessageView.tsx
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { UIMessage } from '../types.js';

export function MessageView({ message }: { message: UIMessage }): React.JSX.Element {
  switch (message.role) {
    case 'user':
      return (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            you ›{' '}
          </Text>
          <Text>{message.text}</Text>
        </Box>
      );
    case 'assistant':
      return (
        <Box marginTop={1} flexDirection="column">
          <Text color="green" bold>
            minicode ›
          </Text>
          <Text>{message.text}</Text>
        </Box>
      );
    case 'tool':
      return <ToolCallView message={message} />;
    case 'info':
      return (
        <Box marginTop={1}>
          <Text color="yellow" dimColor>
            {message.text}
          </Text>
        </Box>
      );
  }
}

function ToolCallView({ message }: { message: UIMessage }): React.JSX.Element {
  return (
    <Box marginLeft={2}>
      {message.status === 'running' ? (
        <Text color="yellow">
          <Spinner type="dots" />{' '}
        </Text>
      ) : (
        <Text color={message.status === 'error' ? 'red' : 'green'}>
          {message.status === 'error' ? '✗ ' : '✓ '}
        </Text>
      )}
      <Text dimColor>{message.text}</Text>
    </Box>
  );
}
