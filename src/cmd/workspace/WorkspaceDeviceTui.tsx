import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { WipeDeviceWizard } from './WipeDeviceWizard.js';
import { ListDevicesTui } from './ListDevicesTui.js';
import type { WorkspaceDeviceCommandDeps } from './commands.js';

export interface WorkspaceDeviceTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceDeviceTui({ deviceDeps, onCancel }: WorkspaceDeviceTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'List ChromeOS Devices', value: 'list-chromeos' },
    { label: 'List Mobile Devices', value: 'list-mobile' },
    { label: 'Wipe Device', value: 'wipe-device' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      if (onCancel) {
        onCancel();
      }
    } else if (activeView !== null && key.escape) {
      setActiveView(null);
    }
  });

  if (activeView === 'wipe-device') {
    return (
      <WipeDeviceWizard
        deviceDeps={deviceDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-chromeos') {
    return (
      <ListDevicesTui
        deviceDeps={deviceDeps}
        type="chromebook"
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-mobile') {
    return (
      <ListDevicesTui
        deviceDeps={deviceDeps}
        type="mobile"
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Device Management</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}
