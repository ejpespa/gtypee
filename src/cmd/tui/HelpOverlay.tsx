import React from 'react';
import { Box, Text } from 'ink';

export interface HelpOverlayProps {
  lines: string[];
  onClose: () => void;
}

export function HelpOverlay({ lines, onClose }: HelpOverlayProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      marginBottom={1}
    >
      <Text bold color="yellow">Help</Text>
      <Box marginTop={1} flexDirection="column">
        {lines.length === 0 ? (
          <Text color="gray">No context-specific help for this screen.</Text>
        ) : (
          lines.map((line) => (
            <Text key={line} color="white">{line}</Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press ? or ESC to close</Text>
      </Box>
    </Box>
  );
}