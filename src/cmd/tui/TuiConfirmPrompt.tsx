import React from 'react';
import { Box, Text, useInput } from 'ink';

export type TuiConfirmPromptProps = {
  title: string;
  message: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function TuiConfirmPrompt({
  title,
  message,
  destructive = false,
  onConfirm,
  onCancel,
}: TuiConfirmPromptProps) {
  useInput((input, key) => {
    if (key.escape || input === 'n') {
      onCancel();
      return;
    }
    if (input === 'y') {
      void onConfirm();
    }
  });

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={destructive ? 'red' : 'yellow'}
    >
      <Text bold color="cyan">{title}</Text>
      <Text color={destructive ? 'red' : 'yellow'}>{message}</Text>
      <Box marginTop={1}>
        <Text color="gray">y confirm · n or ESC cancel</Text>
      </Box>
    </Box>
  );
}