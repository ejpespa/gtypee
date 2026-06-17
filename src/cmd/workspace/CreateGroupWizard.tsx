import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { WorkspaceGroupCommandDeps, CreateGroupResult } from './commands.js';

export interface CreateGroupWizardProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'NAME' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function CreateGroupWizard({ groupDeps, onCancel }: CreateGroupWizardProps) {
  const [step, setStep] = useState<Step>('EMAIL');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateGroupResult | null>(null);

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      if (!groupDeps.createGroup) {
        throw new Error('createGroup dependency function is not provided.');
      }
      const res = await groupDeps.createGroup({
        email,
        name,
      });
      if (res.applied) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error('Group creation was not applied (failed).');
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred during group creation.');
      setStep('CONFIRM'); // fallback to CONFIRM step to allow retry
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (onCancel) {
        onCancel();
      }
    }

    if (step === 'CONFIRM') {
      if (input.toLowerCase() === 'y' || key.return) {
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
      setValidationError('Please enter a valid email address (e.g., group@domain.com).');
      return;
    }
    setValidationError(null);
    setEmail(trimmed);
    setStep('NAME');
  };

  const handleNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Group name cannot be empty.');
      return;
    }
    setValidationError(null);
    setName(trimmed);
    setStep('CONFIRM');
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Create Group Wizard</Text>
      </Box>

      {/* Show context of filled values */}
      {step !== 'EMAIL' && (
        <Text>Email: <Text color="green">{email}</Text></Text>
      )}
      {step !== 'EMAIL' && step !== 'NAME' && (
        <Text>Group Name: <Text color="green">{name}</Text></Text>
      )}

      {/* Steps */}
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

      {step === 'NAME' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Group Name: </Text>
            <TextInput
              value={nameInput}
              onChange={(val) => {
                setNameInput(val);
                setValidationError(null);
              }}
              onSubmit={handleNameSubmit}
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
            <Text bold color="yellow">Please confirm the details above.</Text>
            <Text color="white">Press <Text bold color="green">'y'</Text> or <Text bold color="green">Enter</Text> to create the group, or <Text bold color="red">ESC</Text> to cancel.</Text>
          </Box>
        </Box>
      )}

      {step === 'SUBMITTING' && (
        <Box marginTop={1}>
          <Text color="yellow">Creating group in Google Workspace...</Text>
        </Box>
      )}

      {step === 'DONE' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>Group created successfully!</Text>
          {result && (
            <Box flexDirection="column" marginTop={1}>
              <Text>Group ID: <Text color="cyan">{result.groupId}</Text></Text>
              <Text>Email: <Text color="cyan">{result.email}</Text></Text>
              <Text>Name: <Text color="cyan">{result.name}</Text></Text>
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
