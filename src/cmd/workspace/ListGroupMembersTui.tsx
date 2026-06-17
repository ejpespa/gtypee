import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceGroupCommandDeps, GroupMember } from './commands.js';

export interface ListGroupMembersTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

type ViewStep = 'PICK_GROUP' | 'MEMBERS';

function formatMemberLabel(member: GroupMember): string {
  return `${member.email} — ${member.role} — ${member.status}`;
}

function memberId(member: GroupMember): string {
  return `${member.email}::${member.role}`;
}

export function ListGroupMembersTui({ groupDeps, onCancel }: ListGroupMembersTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [step, setStep] = useState<ViewStep>('PICK_GROUP');
  const [groupEmailInput, setGroupEmailInput] = useState('');
  const [groupEmail, setGroupEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  const fetchAll = useCallback(async () => {
    if (!groupDeps.listGroupMembers) {
      throw new Error('listGroupMembers dependency function is not provided.');
    }
    return groupDeps.listGroupMembers(groupEmail);
  }, [groupDeps, groupEmail]);

  const {
    allItems: members,
    currentIndex,
    setCurrentIndex,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: groupEmail,
    enabled: step === 'MEMBERS' && groupEmail.length > 0,
    pageSize: DEFAULT_TUI_PAGE_SIZE,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    if (step === 'PICK_GROUP') {
      setBreadcrumbs(['Workspace', 'Groups', 'Members']);
      setHelpLines([
        'Enter group email and press Enter',
        'ESC — back',
      ]);
      return;
    }

    setBreadcrumbs(['Workspace', 'Groups', 'Members']);
    setHelpLines([
      '/ or s — filter results',
      'r — refresh members',
      'Enter — view member',
      'c — copy email (in detail)',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, step]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft, setCurrentIndex]);

  const filteredMembers = filterItemsByQuery(
    members,
    appliedSearch,
    (member) => [member.email, member.role, member.status],
  );

  const { slice: visibleMembers, hasNextPage: filteredHasNextPage } = sliceLocalPage(
    filteredMembers,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / DEFAULT_TUI_PAGE_SIZE));

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedMember(null);
  }, [actions, detail]);

  const handleSelectMember = useCallback(async (id: string) => {
    const member = filteredMembers.find((m) => memberId(m) === id);
    if (!member) return;

    actions.resetStatus();
    setSelectedMember(member);

    await detail.open({
      title: member.email,
      load: async () => [
        `Email: ${member.email}`,
        `Role: ${member.role}`,
        `Type: ${member.status || '(none)'}`,
      ],
    });
  }, [actions, detail, filteredMembers]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedMember) return [];

    return [
      {
        key: 'c',
        label: 'copy email',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(selectedMember.email);
          return `Copied email: ${selectedMember.email}`;
        }),
      },
    ];
  }, [actions, selectedMember]);

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
    setAppliedSearch('');
    setSearchDraft('');
    setIsEditingSearch(false);
    setStep('MEMBERS');
  };

  const blocked = isEditingSearch || detail.isOpen;

  useInput((input, key) => {
    if (step === 'PICK_GROUP') {
      if (key.escape) {
        onCancel?.();
      }
      return;
    }

    if (detail.isOpen) return;

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
    }
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

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Member'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailPanelActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

  const emptyMessage = members.length === 0
    ? `No members found in ${groupEmail}.`
    : appliedSearch
      ? `No members match "${appliedSearch}". Clear search to see all results.`
      : 'No members found.';

  return (
    <TuiListScreen
      title={`Group Members: ${groupEmail}`}
      pageLabel={`Page ${currentIndex + 1}/${totalPages}`}
      items={visibleMembers}
      loading={loading}
      error={error}
      hasNextPage={filteredHasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectMember}
      formatLabel={formatMemberLabel}
      getId={memberId}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="press / or s to edit · Enter to apply · ESC to cancel · filters all results"
        />
      )}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && filteredHasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}