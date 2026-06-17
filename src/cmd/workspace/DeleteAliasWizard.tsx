import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { translateApiError } from '../tui/translateApiError.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface DeleteAliasWizardProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'LOADING' | 'ALIAS' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function DeleteAliasWizard({ userDeps, prefillEmail, onCancel }: DeleteAliasWizardProps) {
  const [step, setStep] = useState<Step>(prefillEmail ? 'LOADING' : 'EMAIL');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [emailInput, setEmailInput] = useState(prefillEmail ?? '');
  const [aliases, setAliases] = useState<string[]>([]);
  const [selectedAlias, setSelectedAlias] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState('');

  const loadAliases = useCallback(async (userEmail: string) => {
    setStep('LOADING');
    setApiError(null);
    try {
      const list = await userDeps.listAliases(userEmail);
      setAliases(list);
      setStep('ALIAS');
    } catch (err: unknown) {
      setApiError(translateApiError(err));
      setStep('EMAIL');
    }
  }, [userDeps]);

  useEffect(() => {
    if (step === 'LOADING' && email) {
      void loadAliases(email);
    }
  }, [email, loadAliases, step]);

  const handleEmailSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Email cannot be empty.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    setValidationError(null);
    setEmail(trimmed);
    setStep('LOADING');
  };

  const handleAliasSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Alias cannot be empty.');
      return;
    }
    setValidationError(null);
    setSelectedAlias(trimmed);
    setStep('CONFIRM');
  };

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      const result = await userDeps.deleteAlias(email, selectedAlias);
      if (!result.applied) {
        throw new Error('Failed to delete alias');
      }
      setResultMessage(`Alias deleted: ${result.alias}`);
      setStep('DONE');
    } catch (err: unknown) {
      setApiError(translateApiError(err));
      setStep('CONFIRM');
    }
  };

  useInput((input, key) => {
    if (step === 'DONE') {
      if (key.escape) onCancel?.();
      return;
    }

    if (key.escape) {
      if (step === 'CONFIRM') {
        setStep('ALIAS');
        setApiError(null);
        return;
      }
      if (step === 'ALIAS') {
        if (prefillEmail) {
          onCancel?.();
        } else {
          setStep('EMAIL');
          setValidationError(null);
        }
        return;
      }
      onCancel?.();
      return;
    }

    if (step === 'CONFIRM' && input === 'y') {
      void handleConfirm();
    }
  });

  if (step === 'LOADING') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">Delete Alias</Text>
        <Text color="yellow">Loading aliases for {email}...</Text>
      </Box>
    );
  }

  if (step === 'SUBMITTING') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">Delete Alias</Text>
        <Text color="yellow">Deleting alias...</Text>
      </Box>
    );
  }

  if (step === 'DONE') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
        <Text bold color="cyan">Delete Alias</Text>
        <Text color="green">{resultMessage}</Text>
        <Box marginTop={1}>
          <Text color="gray">ESC to close</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'CONFIRM') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
        <Text bold color="cyan">Delete Alias</Text>
        <Text>Email: <Text color="green">{email}</Text></Text>
        <Text>Alias: <Text color="yellow">{selectedAlias}</Text></Text>
        {apiError && (
          <Box marginTop={1}>
            <Text color="red">Error: {apiError}</Text>
          </Box>
        )}
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">Confirm destructive action</Text>
          <Text color="gray">y confirm · ESC cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text bold color="cyan">Delete Alias</Text>

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
          {apiError && <Text color="red">{apiError}</Text>}
        </Box>
      )}

      {step === 'ALIAS' && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Email: <Text color="green">{email}</Text></Text>
          {aliases.length > 0 ? (
            <>
              <Box marginTop={1}>
                <Text color="cyan">Select alias to delete:</Text>
              </Box>
              <SelectInput
                items={aliases.map((alias) => ({ label: alias, value: alias }))}
                onSelect={(item) => {
                  setSelectedAlias(item.value);
                  setStep('CONFIRM');
                }}
              />
              <Box marginTop={1}>
                <Text color="gray">Or type an alias below:</Text>
              </Box>
            </>
          ) : (
            <Box marginTop={1}>
              <Text color="yellow">No aliases found. Enter alias to delete:</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text bold>Alias: </Text>
            <TextInput
              value={aliasInput}
              onChange={(val) => {
                setAliasInput(val);
                setValidationError(null);
              }}
              onSubmit={handleAliasSubmit}
              focus
            />
          </Box>
          {validationError && <Text color="red">{validationError}</Text>}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Enter next · ESC cancel</Text>
      </Box>
    </Box>
  );
}