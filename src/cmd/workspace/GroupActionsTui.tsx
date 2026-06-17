import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { WorkspaceGroupCommandDeps } from './commands.js';

export interface GroupActionsTuiProps {
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  prefillGroupEmail?: string;
  onViewMembers?: (groupEmail: string) => void;
  onCancel?: () => void;
}

export function GroupActionsTui({ groupDeps: _groupDeps, prefillGroupEmail, onViewMembers, onCancel }: GroupActionsTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'View Members', value: 'view-members' },
    { label: 'Delete Group (Phase 3)', value: 'delete-group' },
    { label: 'Add Member (Phase 3)', value: 'add-member' },
    { label: 'Remove Member (Phase 3)', value: 'remove-member' },
  ];

  useInput((_input, key) => {
    if (activeView === null && key.escape) onCancel?.();
    if (activeView !== null && key.escape) setActiveView(null);
  });

  const handleSelect = (item: { value: string }) => {
    if (item.value === 'view-members' && prefillGroupEmail && onViewMembers) {
      onViewMembers(prefillGroupEmail);
      onCancel?.();
      return;
    }
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
        <Text bold color="cyan">Group Actions</Text>
        {prefillGroupEmail ? <Text color="gray"> — {prefillGroupEmail}</Text> : null}
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}><Text color="gray">Press ESC to return</Text></Box>
    </Box>
  );
}