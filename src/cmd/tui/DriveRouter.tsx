import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListFilesTui } from '../drive/ListFilesTui.js';
import type { DriveCommandDeps } from '../drive/commands.js';

interface DriveRouterProps {
  deps: Required<DriveCommandDeps>;
  onCancel: () => void;
}

export function DriveRouter({ deps, onCancel }: DriveRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Files', value: 'list' },
    { label: 'Search Files', value: 'search' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListFilesTui
        driveDeps={deps}
        title="List Files"
        mode="list"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'search') {
    return (
      <ListFilesTui
        driveDeps={deps}
        title="Search Files"
        mode="search"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Drive</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}