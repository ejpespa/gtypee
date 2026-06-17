import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListFormsTui } from '../forms/ListFormsTui.js';
import type { FormsCommandDeps } from '../forms/commands.js';

interface FormsRouterProps {
  deps: Required<FormsCommandDeps>;
  onCancel: () => void;
}

export function FormsRouter({ deps, onCancel }: FormsRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Forms', value: 'list' },
  ];

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListFormsTui
        formsDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Forms</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => setActiveSubMenu(item.value)} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}