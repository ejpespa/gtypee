import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { WorkspaceDeviceCommandDeps, DeviceActionResult } from './commands.js';

export interface WipeDeviceWizardProps {
  deviceDeps: WorkspaceDeviceCommandDeps;
  onCancel?: () => void;
}

type Step = 'DEVICE_ID' | 'CONFIRM' | 'WIPING' | 'DONE';

export function WipeDeviceWizard({ deviceDeps, onCancel }: WipeDeviceWizardProps) {
  const [step, setStep] = useState<Step>('DEVICE_ID');

  // Confirmed values
  const [deviceId, setDeviceId] = useState('');

  // Input values (live typing)
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<DeviceActionResult | null>(null);

  // Global escape handler
  useInput((_input, key) => {
    if (key.escape) {
      if (onCancel) {
        onCancel();
      }
    }
  });

  const handleDeviceIdSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Device ID cannot be empty.');
      return;
    }
    setValidationError(null);
    setDeviceId(trimmed);
    setStep('CONFIRM');
  };

  const handleConfirmSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed !== 'WIPE') {
      setValidationError("You must type 'WIPE' exactly to confirm.");
      return;
    }
    setValidationError(null);
    setApiError(null);
    setStep('WIPING');
  };

  useEffect(() => {
    if (step !== 'WIPING') return;

    let active = true;
    const runWipe = async () => {
      try {
        if (!deviceDeps.wipeDevice) {
          throw new Error('wipeDevice dependency function is not provided.');
        }
        const res = await deviceDeps.wipeDevice(deviceId);
        if (!active) return;
        if (res.applied) {
          setResult(res);
          setStep('DONE');
        } else {
          throw new Error('Device wipe action was not applied (failed).');
        }
      } catch (err: any) {
        if (!active) return;
        setApiError(err.message || 'An error occurred during device wiping.');
        setConfirmInput(''); // reset confirmation input on retry
        setStep('CONFIRM');
      }
    };

    runWipe();

    return () => {
      active = false;
    };
  }, [step, deviceId, deviceDeps]);

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
      <Box marginBottom={1}>
        <Text bold color="red">Workspace Admin: Wipe Device Wizard</Text>
      </Box>

      {/* Show context of filled values */}
      {step !== 'DEVICE_ID' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>Device ID: <Text color="yellow" bold>{deviceId}</Text></Text>
        </Box>
      )}

      {/* Steps */}
      {step === 'DEVICE_ID' && (
        <Box flexDirection="column">
          <Box>
            <Text bold>Enter Device ID: </Text>
            <TextInput
              value={deviceIdInput}
              onChange={(val) => {
                setDeviceIdInput(val);
                setValidationError(null);
              }}
              onSubmit={handleDeviceIdSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Box marginTop={1}>
              <Text color="red">{validationError}</Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'CONFIRM' && (
        <Box flexDirection="column">
          {apiError && (
            <Box marginBottom={1}>
              <Text color="red">Error: {apiError}</Text>
            </Box>
          )}
          <Box marginBottom={1}>
            <Text color="red" bold>WARNING: This is a destructive operation. The device will be wiped.</Text>
          </Box>
          <Box>
            <Text bold>Type <Text color="red">'WIPE'</Text> to confirm: </Text>
            <TextInput
              value={confirmInput}
              onChange={(val) => {
                setConfirmInput(val);
                setValidationError(null);
              }}
              onSubmit={handleConfirmSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Box marginTop={1}>
              <Text color="red">{validationError}</Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'WIPING' && (
        <Box>
          <Text color="yellow">Wiping device {deviceId} in Google Workspace...</Text>
        </Box>
      )}

      {step === 'DONE' && (
        <Box flexDirection="column">
          <Text color="green" bold>Device wiped successfully!</Text>
          {result && (
            <Box marginTop={1}>
              <Text>Action status: <Text color="cyan">Applied</Text></Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="gray">Press ESC to exit.</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Wizard: [ESC to quit]</Text>
      </Box>
    </Box>
  );
}
