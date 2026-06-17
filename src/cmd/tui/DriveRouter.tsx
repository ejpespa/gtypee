import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListFilesTui } from '../drive/ListFilesTui.js';
import { ListTrashTui } from '../drive/ListTrashTui.js';
import { ListSharedDrivesTui } from '../drive/ListSharedDrivesTui.js';
import type { DriveCommandDeps, DriveSharedDrivesDeps, DriveTrashDeps } from '../drive/commands.js';

interface DriveRouterProps {
  deps: Required<DriveCommandDeps>;
  trashDeps: Required<DriveTrashDeps>;
  sharedDrivesDeps: Required<DriveSharedDrivesDeps>;
  onCancel: () => void;
}

export function DriveRouter({ deps, trashDeps, sharedDrivesDeps, onCancel }: DriveRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Files', value: 'files' },
    { label: 'Trash', value: 'trash' },
    { label: 'Shared Drives', value: 'shared-drives' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'files') {
    return (
      <ListFilesTui
        driveDeps={deps}
        title="Files"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'trash') {
    return (
      <ListTrashTui
        trashDeps={trashDeps}
        driveDeps={deps}
        title="Trash"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'shared-drives') {
    return (
      <ListSharedDrivesTui
        sharedDrivesDeps={sharedDrivesDeps}
        title="Shared Drives"
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