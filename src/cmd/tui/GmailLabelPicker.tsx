import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { GmailLabelSummary } from '../gmail/commands.js';
import { translateApiError } from './translateApiError.js';

export type GmailLabelPickerProps = {
  listLabels: () => Promise<GmailLabelSummary[]>;
  messageLabelIds: string[];
  onSelect: (label: GmailLabelSummary, action: 'add' | 'remove') => void;
  onCancel: () => void;
};

export function GmailLabelPicker({
  listLabels,
  messageLabelIds,
  onSelect,
  onCancel,
}: GmailLabelPickerProps) {
  const [labels, setLabels] = useState<GmailLabelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listLabels()
      .then((result) => {
        if (active) setLabels(result);
      })
      .catch((err: unknown) => {
        if (active) setError(translateApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [listLabels]);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  if (loading) {
    return <Text color="yellow">Loading labels...</Text>;
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">ESC cancel</Text>
      </Box>
    );
  }

  if (labels.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">No labels found.</Text>
        <Text color="gray">ESC cancel</Text>
      </Box>
    );
  }

  const items = labels.map((label) => {
    const hasLabel = messageLabelIds.includes(label.id);
    return {
      label: `${hasLabel ? '- ' : '+ '}${label.name}`,
      value: label.id,
    };
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text bold color="cyan">Choose label</Text>
      <Text color="gray">+ add · - remove · ESC cancel</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            const label = labels.find((entry) => entry.id === item.value);
            if (!label) return;
            const action = messageLabelIds.includes(label.id) ? 'remove' : 'add';
            onSelect(label, action);
          }}
        />
      </Box>
    </Box>
  );
}