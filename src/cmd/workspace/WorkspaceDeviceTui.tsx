import React, { useEffect, useState } from 'react';
import { useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { WipeDeviceWizard } from './WipeDeviceWizard.js';
import { ListDevicesTui } from './ListDevicesTui.js';
import type { WorkspaceDeviceCommandDeps } from './commands.js';

export interface WorkspaceDeviceTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceDeviceTui({ deviceDeps, onCancel }: WorkspaceDeviceTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Devices']);
      setHelpLines(['↑/↓ select · Enter open · ? help · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

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
    <TuiScreenShell title="Device Management">
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}
