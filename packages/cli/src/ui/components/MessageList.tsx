// packages/cli/src/ui/components/MessageList.tsx
import { Box } from 'ink';
import type { UIMessage } from '../types.js';
import { MessageView } from './MessageView.js';

export function MessageList({
  messages,
}: {
  messages: UIMessage[];
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {messages.map((m) => (
        <MessageView key={m.id} message={m} />
      ))}
    </Box>
  );
}
