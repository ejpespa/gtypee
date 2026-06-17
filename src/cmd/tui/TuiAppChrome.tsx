import React from 'react';
import { Box, Text } from 'ink';
import { useTuiNavigation } from './TuiNavigationContext.js';

export function TuiAppChrome() {
  const { accountEmail, breadcrumbs } = useTuiNavigation();

  return (
    <Box flexDirection="column" marginBottom={1} flexShrink={0}>
      <Box>
        <Text color="gray">Account: </Text>
        <Text color="green">{accountEmail || '(unknown)'}</Text>
      </Box>
      {breadcrumbs.length > 0 && (
        <Box>
          <Text color="gray">{breadcrumbs.join(' › ')}</Text>
        </Box>
      )}
    </Box>
  );
}