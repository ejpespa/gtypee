import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { copyToClipboard } from '../tui/systemActions.js';
import type { WorkspaceUserCommandDeps, BackupCodesResult } from './commands.js';

export interface GenerateBackupCodesWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function GenerateBackupCodesWizard({ userDeps, prefillEmail, onCancel }: GenerateBackupCodesWizardProps) {
  const [step, setStep] = useState<Step>(prefillEmail ? 'CONFIRM' : 'EMAIL');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [emailInput, setEmailInput] = useState(prefillEmail ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<BackupCodesResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      const res = await userDeps.generateBackupCodes(email);
      if (res.applied && res.codes.length > 0) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error(res.error ?? 'Backup codes were not generated. Ensure 2-Step Verification is enabled for this user.');
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'An error occurred while generating backup codes.');
      setStep('CONFIRM');
    }
  };

  useInput((input, key) => {
    if (step === 'DONE') {
      if (input === 'c' && result?.codes.length) {
        void copyToClipboard(result.codes.join('\n')).then(() => {
          setCopyStatus('Backup codes copied to clipboard.');
        }).catch(() => {
          setCopyStatus('Failed to copy backup codes.');
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
        <Text bold color="cyan">Workspace Admin: Generate Backup Codes</Text>
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
          <Text bold color="yellow">Generate new backup codes for this user?</Text>
          <Text color="gray">Existing unused codes may be invalidated. User must have 2-Step Verification enabled.</Text>
          <Text color="white">Press <Text bold color="green">y</Text> to confirm, or <Text bold color="red">ESC</Text> to cancel.</Text>
        </Box>
      )}

      {step === 'SUBMITTING' && (
        <Box marginTop={1}>
          <Text color="yellow">Generating backup codes via Google Workspace API...</Text>
        </Box>
      )}

      {step === 'DONE' && result && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>Backup codes generated!</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Email: <Text color="cyan">{result.email}</Text></Text>
            {result.codes.map((code, index) => (
              <Text key={`${code}-${index}`} color="yellow">{code}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Save these codes — they will not be shown again. Press c to copy · ESC to exit.</Text>
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