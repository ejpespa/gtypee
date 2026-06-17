import React from 'react';
import { Box, Text } from 'ink';

export interface TuiListFooterProps {
  currentIndex: number;
  hasNextPage: boolean;
  loading: boolean;
  backHint?: string;
}

export function TuiListFooter({
  currentIndex,
  hasNextPage,
  loading,
  backHint = 'ESC to return',
}: TuiListFooterProps) {
  return (
    <Box flexShrink={0}>
      <Text color="gray">Navigation: </Text>
      <Text color={currentIndex > 0 && !loading ? 'green' : 'gray'}>[← Prev]</Text>
      <Text color="gray">  </Text>
      <Text color={hasNextPage && !loading ? 'green' : 'gray'}>[Next →]</Text>
      <Text color="gray">
        {' '}
        | ←/→ or Space · {backHint}
        {loading ? ' | Loading...' : ''}
      </Text>
    </Box>
  );
}