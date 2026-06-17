import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { WorkspaceGroupCommandDeps, GroupMember } from './commands.js';

export interface ListGroupMembersTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

type ViewStep = 'PICK_GROUP' | 'MEMBERS';

export function ListGroupMembersTui({ groupDeps, onCancel }: ListGroupMembersTuiProps) {
  const [step, setStep] = useState<ViewStep>('PICK_GROUP');
  const [groupEmailInput, setGroupEmailInput] = useState('');
  const [groupEmail, setGroupEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  const handleGroupEmailSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Group email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError('Please enter a valid group email (e.g., group@domain.com).');
      return;
    }

    setValidationError(null);
    setGroupEmail(trimmed);
    setLoading(true);
    setError(null);
    setMembers([]);
    setCurrentIndex(0);
    setAppliedSearch('');
    setSearchDraft('');
    setIsEditingSearch(false);
    setStep('MEMBERS');

    try {
      if (!groupDeps.listGroupMembers) {
        throw new Error('listGroupMembers dependency function is not provided.');
      }
      const result = await groupDeps.listGroupMembers(trimmed);
      setMembers(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch group members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = filterItemsByQuery(
    members,
    appliedSearch,
    (member) => [member.email, member.role, member.status],
  );

  const { slice: visibleMembers, hasNextPage } = sliceLocalPage(
    filteredMembers,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / DEFAULT_TUI_PAGE_SIZE));

  useInput((input, key) => {
    if (step === 'PICK_GROUP') {
      if (key.escape) {
        onCancel?.();
      }
      return;
    }

    if (isEditingSearch) {
      if (key.escape) {
        setSearchDraft(appliedSearch);
        setIsEditingSearch(false);
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  if (step === 'PICK_GROUP') {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexShrink={0} marginBottom={1}>
          <Text bold color="cyan">List Group Members</Text>
        </Box>

        <Box flexShrink={0} marginBottom={1}>
          <Text>Group email: </Text>
          <TextInput
            value={groupEmailInput}
            onChange={(val) => {
              setGroupEmailInput(val);
              setValidationError(null);
            }}
            onSubmit={(value) => { void handleGroupEmailSubmit(value); }}
          />
        </Box>

        {validationError && (
          <Box flexShrink={0} marginBottom={1}>
            <Text color="red">{validationError}</Text>
          </Box>
        )}

        <Box flexShrink={0}>
          <Text color="gray">Enter group email and press Enter to load members · ESC to return</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text bold color="cyan">
          Group Members: {groupEmail}
          {!loading && filteredMembers.length > 0
            ? ` (${filteredMembers.length} total · page ${currentIndex + 1}/${totalPages})`
            : ''}
        </Text>
      </Box>

      <Box flexShrink={0}>
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="press / or s to edit · Enter to apply · ESC to cancel · filters all results"
        />
      </Box>

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {loading ? (
          <Text color="yellow">Loading group members...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : members.length === 0 ? (
          <Text color="gray">No members found in {groupEmail}.</Text>
        ) : filteredMembers.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No members match "${appliedSearch}". Clear search to see all results.`
              : 'No members found.'}
          </Text>
        ) : (
          visibleMembers.map((member, index) => (
            <Box key={`${member.email}-${member.role}-${index}`} marginBottom={0}>
              <Text wrap="wrap">
                <Text color="green">{member.email}</Text>
                <Text color="gray"> — {member.role} — {member.status}</Text>
              </Text>
            </Box>
          ))
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={hasNextPage}
        loading={loading}
      />
    </Box>
  );
}