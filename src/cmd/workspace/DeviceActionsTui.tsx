import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { WipeDeviceWizard } from './WipeDeviceWizard.js';
import type { WorkspaceDeviceCommandDeps } from './commands.js';

export interface DeviceActionsTuiProps {
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  prefillDeviceId?: string;
  onCancel?: () => void;
}

export function DeviceActionsTui({ deviceDeps, prefillDeviceId, onCancel }: DeviceActionsTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'Wipe Device', value: 'wipe-device' },
  ];

  useInput((_input, key) => {
    if (activeView === null && key.escape) onCancel?.();
    if (activeView !== null && key.escape) setActiveView(null);
  });

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  const wizardPrefill = prefillDeviceId ? { prefillDeviceId } : {};

  if (activeView === 'wipe-device') {
    return (
      <WipeDeviceWizard
        deviceDeps={deviceDeps}
        {...wizardPrefill}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Device Actions</Text>
        {prefillDeviceId ? <Text color="gray"> — {prefillDeviceId}</Text> : null}
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}><Text color="gray">Press ESC to return</Text></Box>
    </Box>
  );
}