import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { WorkspaceOrgUnitCommandDeps } from './commands.js';

export interface OrgActionsTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  prefillOrgUnitPath?: string;
  onCancel?: () => void;
}

export function OrgActionsTui({ orgDeps: _orgDeps, prefillOrgUnitPath, onCancel }: OrgActionsTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'Update Org Unit (Phase 3)', value: 'update-org' },
    { label: 'Delete Org Unit (Phase 3)', value: 'delete-org' },
  ];

  useInput((_input, key) => {
    if (activeView === null && key.escape) onCancel?.();
    if (activeView !== null && key.escape) setActiveView(null);
  });

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  if (activeView) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Coming in Phase 3: {activeView}</Text>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Org Unit Actions</Text>
        {prefillOrgUnitPath ? <Text color="gray"> — {prefillOrgUnitPath}</Text> : null}
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}><Text color="gray">Press ESC to return</Text></Box>
    </Box>
  );
}