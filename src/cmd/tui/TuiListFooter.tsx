import React from 'react';
import { Box, Text } from 'ink';
import { buildListFooterHint } from './tuiListFooterText.js';

export interface TuiListFooterProps {
  currentIndex: number;
  hasNextPage: boolean;
  loading: boolean;
  backHint?: string;
  detailEnabled?: boolean;
}

export function TuiListFooter({
  currentIndex,
  hasNextPage,
  loading,
  backHint = 'ESC to return',
  detailEnabled = true,
}: TuiListFooterProps) {
  const hint = buildListFooterHint({ detailEnabled, backHint, loading });

  return (
    <Box flexShrink={0}>
      <Text color="gray">Navigation: </Text>
      <Text color={currentIndex > 0 && !loading ? 'green' : 'gray'}>[← Prev]</Text>
      <Text color="gray">  </Text>
      <Text color={hasNextPage && !loading ? 'green' : 'gray'}>[Next →]</Text>
      <Text color="gray"> | {hint}</Text>
    </Box>
  );
}