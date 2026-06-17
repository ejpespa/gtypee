import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { WorkspaceGroupCommandDeps, CreateGroupResult } from './commands.js';

export interface CreateGroupWizardProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

type WizardStep = 'EMAIL' | 'NAME' | 'CONFIRM' | 'DONE';

export function CreateGroupWizard({ groupDeps, onCancel }: CreateGroupWizardProps) {
  const [step, setStep] = useState<WizardStep>('EMAIL');

  // Confirmed values
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Input values (live typing)
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateGroupResult | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Global escape and confirm handler
  useInput((input, key) => {
    if (key.escape) {
      if (onCancel) {
        onCancel();
      }
    }

    if (step === 'CONFIRM' && !loading) {
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
    // Basic email format check
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
      setValidationError('Name cannot be empty.');
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

      {/* Completed steps printed above */}
      {step !== 'EMAIL' && (
        <Text>Email: <Text color="green">{email}</Text></Text>
      )}
      {step !== 'EMAIL' && step !== 'NAME' && (
        <Text>Name: <Text color="green">{name}</Text></Text>
      )}

      {/* Current active step */}
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
            <Text bold>Name: </Text>
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
          {loading ? (
            <Text color="yellow">Creating group in Google Workspace...</Text>
          ) : (
            <Box flexDirection="column">
              <Text bold color="yellow">Please confirm the details above.</Text>
              <Text color="white">Press <Text bold color="green">'y'</Text> to create the group, or <Text bold color="red">ESC</Text> to cancel.</Text>
            </Box>
          )}
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

export interface WorkspaceGroupTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceGroupTui({ groupDeps, onCancel }: WorkspaceGroupTuiProps) {
  const [activeView, setActiveView] = useState<string | null>(null);

  const items = [
    { label: 'Create New Group', value: 'create-group' },
    { label: 'List All Groups', value: 'list-groups' },
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

  if (activeView === 'create-group') {
    return (
      <CreateGroupWizard
        groupDeps={groupDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-groups') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
        <Text>Under construction</Text>
        <Box marginTop={1}>
          <Text color="gray">Press ESC to return</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Group Management</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}
