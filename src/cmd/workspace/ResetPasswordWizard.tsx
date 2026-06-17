import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { copyToClipboard } from '../tui/systemActions.js';
import type { WorkspaceUserCommandDeps, ResetPasswordResult } from './commands.js';

export interface ResetPasswordWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function ResetPasswordWizard({ userDeps, prefillEmail, onCancel }: ResetPasswordWizardProps) {
  const [step, setStep] = useState<Step>(prefillEmail ? 'CONFIRM' : 'EMAIL');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [emailInput, setEmailInput] = useState(prefillEmail ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetPasswordResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      const res = await userDeps.resetPassword(email);
      if (res.applied && res.newPassword) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error('Password reset was not applied.');
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'An error occurred while resetting the password.');
      setStep('CONFIRM');
    }
  };

  useInput((input, key) => {
    if (step === 'DONE') {
      if (input === 'c' && result?.newPassword) {
        void copyToClipboard(result.newPassword).then(() => {
          setCopyStatus('Password copied to clipboard.');
        }).catch(() => {
          setCopyStatus('Failed to copy password.');
        });
      }
      if (key.escape) {
        onCancel?.();
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (step === 'CONFIRM' && input.toLowerCase() === 'y') {
      void handleConfirm();
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
        <Text bold color="cyan">Workspace Admin: Reset Password</Text>
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
          {validationError && <Text color="red">{validationError}</Text>}
        </Box>
      )}

      {step === 'CONFIRM' && (
        <Box flexDirection="column" marginTop={1}>
          {apiError && (
            <Box marginBottom={1}>
              <Text color="red">Error: {apiError}</Text>
            </Box>
          )}
          <Text bold color="yellow">Reset password for this user?</Text>
          <Text color="gray">A new 16-character password will be generated.</Text>
          <Text color="white">Press <Text bold color="green">y</Text> to confirm, or <Text bold color="red">ESC</Text> to cancel.</Text>
        </Box>
      )}

      {step === 'SUBMITTING' && (
        <Box marginTop={1}>
          <Text color="yellow">Resetting password via Google Workspace API...</Text>
        </Box>
      )}

      {step === 'DONE' && result && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>Password reset successfully!</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Email: <Text color="cyan">{result.email}</Text></Text>
            <Text>New password: <Text color="yellow">{result.newPassword}</Text></Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Save this password — it will not be shown again. Press c to copy · ESC to exit.</Text>
          </Box>
          {copyStatus && (
            <Box marginTop={1}>
              <Text color="green">{copyStatus}</Text>
            </Box>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Wizard: [ESC to quit]</Text>
      </Box>
    </Box>
  );
}