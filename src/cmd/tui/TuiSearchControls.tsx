import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface TuiSearchControlsProps {
  appliedSearch: string;
  searchDraft: string;
  isEditing: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  hint?: string;
}

export function TuiSearchControls({
  appliedSearch,
  searchDraft,
  isEditing,
  onDraftChange,
  onSubmit,
  hint = 'press / or s to edit · Enter to apply',
}: TuiSearchControlsProps) {
  return (
    <Box marginBottom={1}>
      <Text color={isEditing ? 'cyan' : 'gray'}>Search: </Text>
      {isEditing ? (
        <TextInput value={searchDraft} onChange={onDraftChange} onSubmit={onSubmit} />
      ) : (
        <Text color="green">{appliedSearch || '(none)'}</Text>
      )}
      <Text color="gray"> · {hint}</Text>
    </Box>
  );
}