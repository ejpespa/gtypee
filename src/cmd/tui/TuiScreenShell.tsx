import React from 'react';
import { Box, Text } from 'ink';

export type TuiScreenShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bordered?: boolean;
};

export function TuiScreenShell({ title, subtitle, children, bordered = true }: TuiScreenShellProps) {
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle={bordered ? 'round' : undefined}
      borderColor={bordered ? 'blue' : undefined}
      paddingX={bordered ? 1 : 0}
      paddingY={bordered ? 0 : 0}
    >
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">{title}</Text>
        {subtitle ? <Text color="gray">{subtitle}</Text> : null}
      </Box>
      {children}
    </Box>
  );
}