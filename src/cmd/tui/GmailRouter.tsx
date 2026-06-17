import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { GmailCommandDeps } from '../gmail/commands.js';

interface GmailRouterProps {
  deps: Required<GmailCommandDeps>;
  onCancel: () => void;
}

export function GmailRouter({ deps: _deps, onCancel }: GmailRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Inbox Messages', value: 'inbox' },
    { label: 'Search Messages', value: 'search' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((input, key) => {
    if (key.escape) {
      if (activeSubMenu !== null) {
        setActiveSubMenu(null);
      } else {
        onCancel();
      }
    }
  });

  if (activeSubMenu === 'inbox' || activeSubMenu === 'search') {
    const title = activeSubMenu === 'inbox' ? 'Inbox Messages' : 'Search Messages';
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">{title}</Text>
        </Box>
        <Text color="yellow">Message list coming soon — wired in Task 11</Text>
        <Box marginTop={1}>
          <Text color="gray">Press ESC to return to Gmail menu</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Gmail</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}