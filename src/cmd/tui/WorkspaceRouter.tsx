import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { DeletedUsersTui } from '../workspace/DeletedUsersTui.js';
import { CreateUserWizard as WorkspaceUserTui } from '../workspace/CreateUserWizard.js';
import type { TuiConfigDeps } from './MasterLayout.js';

interface WorkspaceRouterProps {
  deps: TuiConfigDeps;
  onCancel: () => void;
}

export function WorkspaceRouter({ deps, onCancel }: WorkspaceRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Deleted Users', value: 'deleted-users' },
    { label: 'Create User Wizard', value: 'users' }
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'deleted-users') {
    return (
      <DeletedUsersTui
        reportDeps={deps.reportDeps}
        days={30}
        searchOpts={{}}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'users') {
    return (
      <WorkspaceUserTui
        userDeps={deps.userDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}
