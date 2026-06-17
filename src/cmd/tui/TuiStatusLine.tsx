import React from 'react';
import { Box, Text } from 'ink';

export type TuiStatusLineProps = {
  message: string | null;
  variant?: 'success' | 'error' | 'info';
};

export function TuiStatusLine({ message, variant = 'info' }: TuiStatusLineProps) {
  if (!message) return null;
  const color = variant === 'success' ? 'green' : variant === 'error' ? 'red' : 'gray';
  return (
    <Box marginTop={1}>
      <Text color={color}>{message}</Text>
    </Box>
  );
}