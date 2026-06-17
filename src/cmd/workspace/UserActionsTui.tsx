import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { SuspendUserWizard } from './SuspendUserWizard.js';
import { UnsuspendUserWizard } from './UnsuspendUserWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface UserActionsTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  onCancel?: () => void;
}

export function UserActionsTui({ userDeps, onCancel }: UserActionsTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'Suspend User', value: 'suspend-user' },
    { label: 'Unsuspend User', value: 'unsuspend-user' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      onCancel?.();
      return;
    }
    if (activeView !== null && key.escape) {
      setActiveView(null);
    }
  });

  if (activeView === 'suspend-user') {
    return (
      <SuspendUserWizard
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'unsuspend-user') {
    return (
      <UnsuspendUserWizard
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">User Actions</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}