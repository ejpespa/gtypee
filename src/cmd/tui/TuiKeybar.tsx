import React from 'react';
import { Box, Text } from 'ink';
import { buildKeybarLine, type KeybarOptions } from './tuiListFooterText.js';

export type TuiKeybarProps = KeybarOptions;

export function TuiKeybar(props: TuiKeybarProps) {
  const line = buildKeybarLine(props);

  return (
    <Box flexShrink={0}>
      <Text color="gray">{line}</Text>
    </Box>
  );
}