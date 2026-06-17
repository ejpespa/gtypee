import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListKeepTui } from '../keep/ListKeepTui.js';
import type { KeepCommandDeps } from '../keep/commands.js';

interface KeepRouterProps {
  deps: Required<KeepCommandDeps>;
  onCancel: () => void;
}

export function KeepRouter({ deps, onCancel }: KeepRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Notes', value: 'list' },
  ];

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListKeepTui
        keepDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Keep</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => setActiveSubMenu(item.value)} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}