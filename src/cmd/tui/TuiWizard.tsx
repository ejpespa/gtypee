import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { copyToClipboard } from './systemActions.js';
import { translateApiError } from './translateApiError.js';

export type TuiWizardField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  initialValue?: string;
};

export type TuiWizardProps = {
  title: string;
  fields: TuiWizardField[];
  destructive?: boolean;
  sensitiveResult?: boolean;
  summary?: (values: Record<string, string>) => string;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => Promise<string>;
  onSensitiveCopy?: (value: string) => Promise<void>;
};

type WizardPhase = 'fields' | 'confirm' | 'running' | 'result';

function initialValues(fields: TuiWizardField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.key, field.initialValue ?? '']),
  );
}

export function TuiWizard({
  title,
  fields,
  destructive = false,
  sensitiveResult = false,
  summary,
  onCancel,
  onSubmit,
  onSensitiveCopy,
}: TuiWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>('fields');
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields));
  const [draft, setDraft] = useState('');
  const [multilineLines, setMultilineLines] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentField = fields[fieldIndex];
  const isMultiline = currentField?.multiline === true;

  const confirmText = useMemo(() => {
    if (summary) return summary(values);
    return fields
      .filter((field) => values[field.key])
      .map((field) => `${field.label}: ${values[field.key]}`)
      .join('\n');
  }, [fields, summary, values]);

  const advanceField = useCallback((nextValue: string) => {
    if (!currentField) return;

    const trimmed = nextValue.trim();
    if (currentField.required && !trimmed) {
      setErrorMessage(`${currentField.label} is required`);
      return;
    }

    setErrorMessage(null);
    const nextValues = { ...values, [currentField.key]: nextValue };
    setValues(nextValues);
    setDraft('');
    setMultilineLines([]);

    if (fieldIndex < fields.length - 1) {
      const nextIndex = fieldIndex + 1;
      setFieldIndex(nextIndex);
      setDraft(nextValues[fields[nextIndex]!.key] ?? '');
      return;
    }

    setPhase('confirm');
  }, [currentField, fieldIndex, fields, values]);

  const submit = useCallback(async () => {
    setPhase('running');
    setErrorMessage(null);
    try {
      const message = await onSubmit(values);
      setResultMessage(message);
      setPhase('result');
    } catch (err: unknown) {
      setErrorMessage(translateApiError(err));
      setPhase('confirm');
    }
  }, [onSubmit, values]);

  useInput((input, key) => {
    if (phase === 'running') return;

    if (phase === 'result') {
      if (sensitiveResult && input === 'c') {
        const copy = onSensitiveCopy ?? copyToClipboard;
        void copy(resultMessage);
      }
      if (key.escape) onCancel();
      return;
    }

    if (phase === 'confirm') {
      if (key.escape || input === 'n') {
        setFieldIndex(Math.max(0, fields.length - 1));
        setDraft(values[fields[fields.length - 1]!.key] ?? '');
        setPhase('fields');
        return;
      }
      if (input === 'y') {
        void submit();
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (!currentField || isMultiline) return;

    if (key.return) {
      advanceField(draft);
    }
  });

  const handleMultilineSubmit = useCallback((line: string) => {
    if (!currentField?.multiline) return;

    if (!line.trim() && multilineLines.length > 0) {
      advanceField(multilineLines.join('\n'));
      return;
    }

    if (line.trim()) {
      setMultilineLines((lines) => [...lines, line]);
      setDraft('');
    }
  }, [advanceField, currentField, multilineLines]);

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
        <Text color={sensitiveResult ? 'yellow' : 'green'}>{resultMessage}</Text>
        <Box marginTop={1}>
          {sensitiveResult ? (
            <Text color="gray">Save now — will not be shown again · c copy · ESC close</Text>
          ) : (
            <Text color="gray">ESC to close</Text>
          )}
        </Box>
      </Box>
    );
  }

  if (phase === 'confirm') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor={destructive ? 'red' : 'blue'}>
        <Text bold color="cyan">{title}</Text>
        <Text color={destructive ? 'red' : 'yellow'}>
          {destructive ? 'Confirm destructive action' : 'Confirm'}
        </Text>
        <Box marginTop={1} flexDirection="column">
          {confirmText.split('\n').map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </Box>
        {errorMessage && (
          <Box marginTop={1}>
            <Text color="red">Error: {errorMessage}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">y confirm · n edit · ESC cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text bold color="cyan">{title}</Text>
      <Text color="gray">
        Step {fieldIndex + 1} of {fields.length}
      </Text>
      {currentField && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">{currentField.label}{currentField.required ? ' *' : ''}</Text>
          {isMultiline ? (
            <>
              {multilineLines.map((line, index) => (
                <Text key={`${index}-${line}`} color="gray">{line}</Text>
              ))}
              <TextInput
                value={draft}
                onChange={setDraft}
                onSubmit={handleMultilineSubmit}
                placeholder={currentField.placeholder ?? 'Enter line, empty line to finish'}
              />
              <Text color="gray">Enter line · empty Enter to finish body · ESC cancel</Text>
            </>
          ) : (
            <TextInput
              value={draft}
              onChange={setDraft}
              onSubmit={advanceField}
              {...(currentField.placeholder ? { placeholder: currentField.placeholder } : {})}
            />
          )}
        </Box>
      )}
      {errorMessage && (
        <Box marginTop={1}>
          <Text color="red">Error: {errorMessage}</Text>
        </Box>
      )}
      {!isMultiline && (
        <Box marginTop={1}>
          <Text color="gray">Enter next · ESC cancel</Text>
        </Box>
      )}
    </Box>
  );
}