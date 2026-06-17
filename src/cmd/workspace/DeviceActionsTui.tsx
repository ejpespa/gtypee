import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { translateApiError } from '../tui/translateApiError.js';
import { WipeDeviceWizard } from './WipeDeviceWizard.js';
import type { WorkspaceDeviceCommandDeps } from './commands.js';

export interface DeviceActionsTuiProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  prefillDeviceId?: string;
  onCancel?: () => void;
}

type ConfirmPhase = 'confirm' | 'running' | 'result';

interface PrefillConfirmActionProps {
  title: string;
  message: string;
  destructive?: boolean;
  onAction: () => Promise<string>;
  onCancel: () => void;
}

function PrefillConfirmAction({
  title,
  message,
  destructive = false,
  onAction,
  onCancel,
}: PrefillConfirmActionProps) {
  const [phase, setPhase] = useState<ConfirmPhase>('confirm');
  const [resultMessage, setResultMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useInput((_input, key) => {
    if (phase === 'result' && key.escape) {
      onCancel();
    }
  });

  if (phase === 'running') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">{title}</Text>
        <Text color="yellow">Working...</Text>
      </Box>
    );
  }

  if (phase === 'result') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
        <Text bold color="cyan">{title}</Text>
        <Text color="green">{resultMessage}</Text>
        <Box marginTop={1}>
          <Text color="gray">ESC to close</Text>
        </Box>
      </Box>
    );
  }

  const displayMessage = errorMessage ? `${message}\n\nPrevious error: ${errorMessage}` : message;

  return (
    <TuiConfirmPrompt
      title={title}
      message={displayMessage}
      {...(destructive ? { destructive: true } : {})}
      onCancel={onCancel}
      onConfirm={async () => {
        setPhase('running');
        setErrorMessage(null);
        try {
          const msg = await onAction();
          setResultMessage(msg);
          setPhase('result');
        } catch (err: unknown) {
          setErrorMessage(translateApiError(err));
          setPhase('confirm');
        }
      }}
    />
  );
}

export function DeviceActionsTui({ deviceDeps, prefillDeviceId, onCancel }: DeviceActionsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Devices', 'Actions']);
      setHelpLines(['↑/↓ select · Enter open · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = useMemo(() => {
    const menuItems = [{ label: 'Wipe Device', value: 'wipe-device' }];
    if (deviceDeps.disableDevice) {
      menuItems.push({ label: 'Disable Device', value: 'disable-device' });
    }
    return menuItems;
  }, [deviceDeps.disableDevice]);

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

  const wizardPrefill = prefillDeviceId ? { prefillDeviceId } : {};
  const backToMenu = () => setActiveView(null);

  if (activeView === 'wipe-device') {
    return (
      <WipeDeviceWizard
        deviceDeps={deviceDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'disable-device') {
    if (!prefillDeviceId) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
          <Text bold color="cyan">Disable Device</Text>
          <Text color="red">Device ID is required. Open actions from a device row.</Text>
          <Box marginTop={1}>
            <Text color="gray">ESC to return</Text>
          </Box>
        </Box>
      );
    }

    return (
      <PrefillConfirmAction
        title="Disable Device"
        message={`Disable device ${prefillDeviceId}? The device will no longer sync with Google Workspace.`}
        destructive
        onCancel={backToMenu}
        onAction={async () => {
          if (!deviceDeps.disableDevice) {
            throw new Error('disableDevice is not available');
          }
          const result = await deviceDeps.disableDevice(prefillDeviceId);
          if (!result.applied) {
            throw new Error('Failed to disable device');
          }
          return `Device disabled: ${result.deviceId}`;
        }}
      />
    );
  }

  const subtitle = prefillDeviceId ? prefillDeviceId : undefined;

  return (
    <TuiScreenShell
      title="Device Actions"
      {...(subtitle ? { subtitle } : {})}
    >
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}