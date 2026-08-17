// packages/cli/src/ui/components/InputBox.tsx
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  active: boolean;
  onSubmit(value: string): void;
}

export function InputBox({ active, onSubmit }: Props): React.JSX.Element {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1); // -1 = live line

  useInput(
    (input, key) => {
      if (key.return) {
        const trimmed = value.trim();
        if (trimmed.length === 0) return;
        setHistory((prev) => [...prev, trimmed]);
        setHistIndex(-1);
        setValue('');
        onSubmit(trimmed);
        return;
      }
      if (key.upArrow) {
        if (history.length === 0) return;
        const next =
          histIndex === -1 ? history.length - 1 : Math.max(0, histIndex - 1);
        setHistIndex(next);
        setValue(history[next] ?? '');
        return;
      }
      if (key.downArrow) {
        if (histIndex === -1) return;
        const next = histIndex + 1;
        if (next >= history.length) {
          setHistIndex(-1);
          setValue('');
        } else {
          setHistIndex(next);
          setValue(history[next] ?? '');
        }
        return;
      }
      if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
        return;
      }
      if (key.ctrl || key.meta || key.escape || key.tab) return;
      setValue((v) => v + input);
    },
    { isActive: active },
  );

  return (
    <Box borderStyle="round" borderColor={active ? 'cyan' : 'gray'}>
      <Text color="cyan">{'› '}</Text>
      <Text>
        {value}
        {active ? <Text inverse> </Text> : null}
      </Text>
    </Box>
  );
}
