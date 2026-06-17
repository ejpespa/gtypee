import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { WorkspaceOrgUnitCommandDeps, CreateOrgUnitResult } from './commands.js';

export interface CreateOrgWizardProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

type Step = 'NAME' | 'PARENT_PATH' | 'DESCRIPTION' | 'CONFIRM' | 'SUBMITTING' | 'DONE';

export function CreateOrgWizard({ orgDeps, onCancel }: CreateOrgWizardProps) {
  const [step, setStep] = useState<Step>('NAME');

  const [name, setName] = useState('');
  const [parentOrgUnitPath, setParentOrgUnitPath] = useState('/');
  const [description, setDescription] = useState('');

  const [nameInput, setNameInput] = useState('');
  const [parentInput, setParentInput] = useState('');
  const [descInput, setDescInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrgUnitResult | null>(null);

  const handleConfirm = async () => {
    setStep('SUBMITTING');
    setApiError(null);
    try {
      if (!orgDeps.createOrgUnit) {
        throw new Error('createOrgUnit dependency function is not provided.');
      }
      const res = await orgDeps.createOrgUnit({
        name,
        parentOrgUnitPath,
        description: description || undefined,
      });
      if (res.applied) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error('Org unit creation was not applied (failed).');
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred during org unit creation.');
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

  const handleNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Name cannot be empty.');
      return;
    }
    setValidationError(null);
    setName(trimmed);
    setStep('PARENT_PATH');
  };

  const handleParentSubmit = (value: string) => {
    let trimmed = value.trim();
    if (!trimmed) {
      trimmed = '/';
    }
    // Simple verification if path starts with '/'
    if (!trimmed.startsWith('/')) {
      setValidationError('Parent path must start with "/".');
      return;
    }
    setValidationError(null);
    setParentOrgUnitPath(trimmed);
    setStep('DESCRIPTION');
  };

  const handleDescSubmit = (value: string) => {
    const trimmed = value.trim();
    setValidationError(null);
    setDescription(trimmed);
    setStep('CONFIRM');
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Create Org Unit Wizard</Text>
      </Box>

      {/* Show context of filled values */}
      {step !== 'NAME' && (
        <Text>Name: <Text color="green">{name}</Text></Text>
      )}
      {step !== 'NAME' && step !== 'PARENT_PATH' && (
        <Text>Parent Path: <Text color="green">{parentOrgUnitPath}</Text></Text>
      )}
      {step !== 'NAME' && step !== 'PARENT_PATH' && step !== 'DESCRIPTION' && (
        <Text>Description: <Text color="green">{description || '(None)'}</Text></Text>
      )}

      {/* Steps */}
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

      {step === 'PARENT_PATH' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Parent Path (default /): </Text>
            <TextInput
              value={parentInput}
              placeholder="/"
              onChange={(val) => {
                setParentInput(val);
                setValidationError(null);
              }}
              onSubmit={handleParentSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Text color="red">{validationError}</Text>
          )}
        </Box>
      )}

      {step === 'DESCRIPTION' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Description (optional): </Text>
            <TextInput
              value={descInput}
              onChange={(val) => {
                setDescInput(val);
                setValidationError(null);
              }}
              onSubmit={handleDescSubmit}
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
            <Text color="white">Press <Text bold color="green">'y'</Text> or <Text bold color="green">Enter</Text> to create the organizational unit, or <Text bold color="red">ESC</Text> to cancel.</Text>
          </Box>
        </Box>
      )}

      {step === 'SUBMITTING' && (
        <Box marginTop={1}>
          <Text color="yellow">Creating organization unit in Google Workspace...</Text>
        </Box>
      )}

      {step === 'DONE' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>Organizational unit created successfully!</Text>
          {result && (
            <Box flexDirection="column" marginTop={1}>
              <Text>Org Unit ID: <Text color="cyan">{result.orgUnitId}</Text></Text>
              <Text>Name: <Text color="cyan">{result.name}</Text></Text>
              <Text>Path: <Text color="cyan">{result.orgUnitPath}</Text></Text>
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
