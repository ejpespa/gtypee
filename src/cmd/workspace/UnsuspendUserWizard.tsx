import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { WorkspaceUserCommandDeps, UnsuspendUserResult } from './commands.js';

export interface UnsuspendUserWizardProps {
  userDeps: WorkspaceUserCommandDeps;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function UnsuspendUserWizard({ userDeps, onCancel }: UnsuspendUserWizardProps) {
  const [step, setStep] = useState<Step>('EMAIL');

  const [email, setEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<UnsuspendUserResult | null>(null);

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      if (!userDeps.unsuspendUser) {
        throw new Error('unsuspendUser dependency function is not provided.');
      }
      const res = await userDeps.unsuspendUser(email);
      if (res.applied) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error('User unsuspension was not applied (failed).');
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while unsuspending the user.');
      setStep('CONFIRM');
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
    }

    if (step === 'CONFIRM') {
      if (input.toLowerCase() === 'y') {
        handleConfirm();
      }
    }
  });

  const handleEmailSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Email cannot be empty.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError('Please enter a valid email address (e.g., user@domain.com).');
      return;
    }
    setValidationError(null);
    setEmail(trimmed);
    setStep('CONFIRM');
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Unsuspend User Wizard</Text>
      </Box>

      {step !== 'EMAIL' && (
        <Text>Email: <Text color="green">{email}</Text></Text>
      )}

      {step === 'EMAIL' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Email: </Text>
            <TextInput
              value={emailInput}
              onChange={(val) => {
                setEmailInput(val);
                setValidationError(null);
              }}
              onSubmit={handleEmailSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Text color="red">{validationError}</Text>
          )}
        </Box>
      )}

      {step === 'CONFIRM' && (
        <Box flexDirection="column" marginTop={1}>
          {apiError && (
            <Box marginBottom={1}>
              <Text color="red">Error: {apiError}</Text>
            </Box>
          )}
          <Box flexDirection="column">
            <Text bold color="yellow">Please confirm unsuspension of the user above.</Text>
            <Text color="white">Press <Text bold color="green">'y'</Text> to unsuspend the user, or <Text bold color="red">ESC</Text> to cancel.</Text>
          </Box>
        </Box>
      )}

      {step === 'SUBMITTING' && (
        <Box marginTop={1}>
          <Text color="yellow">Unsuspending user in Google Workspace...</Text>
        </Box>
      )}

      {step === 'DONE' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>User unsuspended successfully!</Text>
          {result && (
            <Box flexDirection="column" marginTop={1}>
              <Text>Email: <Text color="cyan">{result.email}</Text></Text>
              <Text>Suspended: <Text color="cyan">{result.suspended ? 'yes' : 'no'}</Text></Text>
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