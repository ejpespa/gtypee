import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { WorkspaceUserCommandDeps, CreateUserResult } from './commands.js';

export interface CreateUserWizardProps {
  userDeps: WorkspaceUserCommandDeps;
  onCancel?: () => void;
}

type Step = 'EMAIL' | 'FIRST_NAME' | 'LAST_NAME' | 'PASSWORD' | 'CONFIRM' | 'DONE';

export function CreateUserWizard({ userDeps, onCancel }: CreateUserWizardProps) {
  const [step, setStep] = useState<Step>('EMAIL');

  // Confirmed values
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  // Input values (live typing)
  const [emailInput, setEmailInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateUserResult | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setApiError(null);
    try {
      if (!userDeps.createUser) {
        throw new Error('createUser dependency function is not provided.');
      }
      const res = await userDeps.createUser({
        email,
        firstName,
        lastName,
        password,
      });
      if (res.applied) {
        setResult(res);
        setStep('DONE');
      } else {
        throw new Error('User creation was not applied (failed).');
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred during user creation.');
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
      setValidationError('Please enter a valid email address (e.g., user@domain.com).');
      return;
    }
    setValidationError(null);
    setEmail(trimmed);
    setStep('FIRST_NAME');
  };

  const handleFirstNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('First name cannot be empty.');
      return;
    }
    setValidationError(null);
    setFirstName(trimmed);
    setStep('LAST_NAME');
  };

  const handleLastNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Last name cannot be empty.');
      return;
    }
    setValidationError(null);
    setLastName(trimmed);
    setStep('PASSWORD');
  };

  const handlePasswordSubmit = (value: string) => {
    if (value.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }
    setValidationError(null);
    setPassword(value);
    setStep('CONFIRM');
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Create User Wizard</Text>
      </Box>

      {/* Completed steps printed above */}
      {step !== 'EMAIL' && (
        <Text>Email: <Text color="green">{email}</Text></Text>
      )}
      {step !== 'EMAIL' && step !== 'FIRST_NAME' && (
        <Text>First Name: <Text color="green">{firstName}</Text></Text>
      )}
      {step !== 'EMAIL' && step !== 'FIRST_NAME' && step !== 'LAST_NAME' && (
        <Text>Last Name: <Text color="green">{lastName}</Text></Text>
      )}
      {step !== 'EMAIL' && step !== 'FIRST_NAME' && step !== 'LAST_NAME' && step !== 'PASSWORD' && (
        <Text>Password: <Text color="green">{'*'.repeat(password.length)}</Text></Text>
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

      {step === 'FIRST_NAME' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>First Name: </Text>
            <TextInput
              value={firstNameInput}
              onChange={(val) => {
                setFirstNameInput(val);
                setValidationError(null);
              }}
              onSubmit={handleFirstNameSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Text color="red">{validationError}</Text>
          )}
        </Box>
      )}

      {step === 'LAST_NAME' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Last Name: </Text>
            <TextInput
              value={lastNameInput}
              onChange={(val) => {
                setLastNameInput(val);
                setValidationError(null);
              }}
              onSubmit={handleLastNameSubmit}
              focus
            />
          </Box>
          {validationError && (
            <Text color="red">{validationError}</Text>
          )}
        </Box>
      )}

      {step === 'PASSWORD' && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text bold>Password: </Text>
            <TextInput
              value={passwordInput}
              onChange={(val) => {
                setPasswordInput(val);
                setValidationError(null);
              }}
              onSubmit={handlePasswordSubmit}
              mask="*"
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
            <Text color="yellow">Creating user in Google Workspace...</Text>
          ) : (
            <Box flexDirection="column">
              <Text bold color="yellow">Please confirm the details above.</Text>
              <Text color="white">Press <Text bold color="green">'y'</Text> to create the user, or <Text bold color="red">ESC</Text> to cancel.</Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'DONE' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>User created successfully!</Text>
          {result && (
            <Box flexDirection="column" marginTop={1}>
              <Text>User ID: <Text color="cyan">{result.userId}</Text></Text>
              <Text>Primary Email: <Text color="cyan">{result.primaryEmail}</Text></Text>
              <Text>Password: <Text color="yellow">{result.password}</Text></Text>
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
