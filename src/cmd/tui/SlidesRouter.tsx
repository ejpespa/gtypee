import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListSlidesTui } from '../slides/ListSlidesTui.js';
import type { SlidesCommandDeps } from '../slides/commands.js';

interface SlidesRouterProps {
  deps: Required<SlidesCommandDeps>;
  onCancel: () => void;
}

export function SlidesRouter({ deps, onCancel }: SlidesRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Presentations', value: 'list' },
  ];

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListSlidesTui
        slidesDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Slides</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => setActiveSubMenu(item.value)} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}