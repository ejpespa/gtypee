import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { SuspendUserWizard } from './SuspendUserWizard.js';
import { UnsuspendUserWizard } from './UnsuspendUserWizard.js';
import { ResetPasswordWizard } from './ResetPasswordWizard.js';
import { GenerateBackupCodesWizard } from './GenerateBackupCodesWizard.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface UserActionsTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

export function UserActionsTui({ userDeps, prefillEmail, onCancel }: UserActionsTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'Reset Password', value: 'reset-password' },
    { label: 'Generate Backup Codes', value: 'generate-backup-codes' },
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

  const wizardPrefill = prefillEmail ? { prefillEmail } : {};

  if (activeView === 'reset-password') {
    return (
      <ResetPasswordWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'generate-backup-codes') {
    return (
      <GenerateBackupCodesWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'suspend-user') {
    return (
      <SuspendUserWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'unsuspend-user') {
    return (
      <UnsuspendUserWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">User Actions</Text>
        {prefillEmail ? (
          <Text color="gray"> — {prefillEmail}</Text>
        ) : null}
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}