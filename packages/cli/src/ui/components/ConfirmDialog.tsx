// packages/cli/src/ui/components/ConfirmDialog.tsx
import { Box, Text, useInput } from 'ink';
import type { ConfirmationRequest, ConfirmOutcome } from '@minicode/core';

interface Props {
  request: ConfirmationRequest;
  onRespond(outcome: ConfirmOutcome): void;
}

const MAX_DIFF_LINES = 40;

export function ConfirmDialog({ request, onRespond }: Props): React.JSX.Element {
  useInput((input) => {
    const c = input.toLowerCase();
    if (c === 'y') onRespond('yes');
    else if (c === 'a') onRespond('yes-always');
    else if (c === 'n') onRespond('no');
  });

  const diffLines = (request.diff ?? '').split('\n');
  const shown = diffLines.slice(0, MAX_DIFF_LINES);
  const hidden = diffLines.length - shown.length;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={1}
      marginTop={1}
    >
      <Text bold color="yellow">
        approval needed — {request.summary}
      </Text>
      {request.command ? <Text color="white">$ {request.command}</Text> : null}
      {request.diff
        ? shown.map((line, i) => <DiffLine key={i} line={line} />)
        : null}
      {hidden > 0 ? <Text dimColor>… {hidden} more lines</Text> : null}
      <Text>
        <Text color="green" bold>
          [y]
        </Text>
        es · <Text bold>[a]</Text>lways for this tool ·{' '}
        <Text color="red" bold>
          [n]
        </Text>
        o
      </Text>
    </Box>
  );
}

function DiffLine({ line }: { line: string }): React.JSX.Element {
  if (line.startsWith('+') && !line.startsWith('+++'))
    return <Text color="green">{line}</Text>;
  if (line.startsWith('-') && !line.startsWith('---'))
    return <Text color="red">{line}</Text>;
  if (line.startsWith('@@')) return <Text color="cyan">{line}</Text>;
  return <Text dimColor>{line}</Text>;
}
