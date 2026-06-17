import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { CreateOrgWizard } from './CreateOrgWizard.js';
import { ListOrgsTui } from './ListOrgsTui.js';
import type { WorkspaceOrgUnitCommandDeps } from './commands.js';

export interface WorkspaceOrgTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceOrgTui({ orgDeps, onCancel }: WorkspaceOrgTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'List Org Units', value: 'list-orgs' },
    { label: 'Create Org Unit', value: 'create-org' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      if (onCancel) {
        onCancel();
      }
      return;
    }

    if (activeView !== null && key.escape) {
      setActiveView(null);
      return;
    }
  });

  if (activeView === 'create-org') {
    return (
      <CreateOrgWizard
        orgDeps={orgDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-orgs') {
    return (
      <ListOrgsTui
        orgDeps={orgDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Org Unit Management</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}