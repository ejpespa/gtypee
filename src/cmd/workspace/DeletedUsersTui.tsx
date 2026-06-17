import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceReportCommandDeps, DeletedUser, DeletedUserOptions, WorkspaceUserCommandDeps } from './commands.js';

const DAY_OPTIONS = [7, 20, 30] as const;

export interface DeletedUsersTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  days: number;
  searchOpts?: DeletedUserOptions;
  onCancel?: () => void;
}

function formatDeletedUserLabel(user: DeletedUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const namePart = fullName ? ` · ${fullName}` : '';
  return `${user.userEmail}${namePart} · deleted ${user.deletionTime}`;
}

export function DeletedUsersTui({
  reportDeps,
  userDeps,
  days,
  searchOpts = {},
  onCancel,
}: DeletedUsersTuiProps) {
  const { exit } = useApp();
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [lookbackDays, setLookbackDays] = useState(days);
  const [searchDraft, setSearchDraft] = useState(searchOpts.query ?? '');
  const [appliedSearch, setAppliedSearch] = useState(searchOpts.query ?? '');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [selectedUserToRecover, setSelectedUserToRecover] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const pageSize = searchOpts.pageSize || DEFAULT_TUI_PAGE_SIZE;

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Reports', 'Deleted Users']);
    setHelpLines([
      '/ or s — search',
      'd — cycle lookback window (7/20/30 days)',
      'Enter — view deleted user',
      'c/a — actions in detail',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const cycleLookbackDays = useCallback(() => {
    setLookbackDays((current) => {
      const idx = DAY_OPTIONS.indexOf(current as (typeof DAY_OPTIONS)[number]);
      const nextIndex = idx === -1 ? 0 : (idx + 1) % DAY_OPTIONS.length;
      return DAY_OPTIONS[nextIndex] ?? DAY_OPTIONS[0];
    });
  }, []);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      const queryOpts: DeletedUserOptions = {
        ...searchOpts,
        pageSize,
        ...(appliedSearch ? { query: appliedSearch } : {}),
        ...(pageToken !== undefined ? { pageToken } : {}),
      };
      if (!pageToken) {
        delete queryOpts.pageToken;
      }
      return reportDeps.getDeletedUsers(lookbackDays, queryOpts);
    },
    [appliedSearch, lookbackDays, pageSize, reportDeps, searchOpts],
  );

  const {
    items: currentViewUsers,
    currentIndex,
    setCurrentIndex,
    hasNextPage: localHasNextPage,
    loading,
    error,
  } = usePaginatedList({
    fetchPage,
    queryKey: `${lookbackDays}:${pageSize}:${appliedSearch}`,
  });

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedUser(null);
  }, [actions, detail]);

  const openRecoverConfirm = useCallback((email: string) => {
    clearDetail();
    setSelectedUserToRecover(email);
    setRecoveryStatus(null);
    setConfirmInput('');
  }, [clearDetail]);

  const handleSelectUser = useCallback(async (userEmail: string) => {
    const user = currentViewUsers.find((u) => u.userEmail === userEmail);
    if (!user) return;

    actions.resetStatus();
    setSelectedUser(user);

    await detail.open({
      title: user.userEmail,
      load: async () => {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '(none)';
        return [
          `Email: ${user.userEmail}`,
          `Name: ${fullName}`,
          `Deletion time: ${user.deletionTime}`,
        ];
      },
    });
  }, [actions, currentViewUsers, detail]);

  const handleRecoveryConfirm = async (val: string) => {
    if (val.trim().toLowerCase() === 'y' && selectedUserToRecover) {
      setIsRecovering(true);
      try {
        const result = await userDeps.recoverUser(selectedUserToRecover);
        setRecoveryStatus(result.applied ? 'Successfully recovered!' : 'Failed to recover user.');
      } catch (e: unknown) {
        setRecoveryStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      setIsRecovering(false);
    } else if (val.trim().toLowerCase() !== 'y') {
      setSelectedUserToRecover(null);
      setConfirmInput('');
    }
  };

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedUser) return [];

    return [
      {
        key: 'c',
        label: 'copy email',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(selectedUser.userEmail);
          return `Copied email: ${selectedUser.userEmail}`;
        }),
      },
      {
        key: 'a',
        label: 'recover user',
        onAction: () => {
          openRecoverConfirm(selectedUser.userEmail);
        },
      },
    ];
  }, [actions, openRecoverConfirm, selectedUser]);

  const blocked = isEditingSearch || detail.isOpen || selectedUserToRecover !== null;

  useInput((input, key) => {
    if (selectedUserToRecover !== null) {
      if (key.escape) {
        setSelectedUserToRecover(null);
        setRecoveryStatus(null);
        setConfirmInput('');
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

    if (input === 'q' || key.escape) {
      if (onCancel) return onCancel();
      exit();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
      return;
    }

    if (input === 'd') {
      cycleLookbackDays();
    }
  });

  if (selectedUserToRecover !== null) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexShrink={0} marginBottom={1}>
          <Text bold color="cyan">
            Deleted Users (last {lookbackDays} days · page {currentIndex + 1})
          </Text>
        </Box>

        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
          <Text bold color="yellow">Confirm Action: Recover User Account</Text>
          <Text>
            Recover account: <Text bold>{selectedUserToRecover}</Text>?
          </Text>
          <Text color="gray">[y/Enter] to Confirm | [ESC] to Cancel</Text>

          {isRecovering && (
            <Box marginTop={1}><Text color="cyan">Recovering user via Google Admin API...</Text></Box>
          )}
          {recoveryStatus && (
            <Box marginTop={1}>
              <Text color={recoveryStatus.includes('Error') || recoveryStatus.includes('Failed') ? 'red' : 'green'}>
                {recoveryStatus}
              </Text>
            </Box>
          )}

          {!isRecovering && !recoveryStatus && (
            <Box marginTop={1}>
              <Text>Confirm: </Text>
              <TextInput value={confirmInput} onChange={setConfirmInput} onSubmit={handleRecoveryConfirm} />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Deleted User'}
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

  const emptyMessage = appliedSearch
    ? `No deleted users match "${appliedSearch}" on this page.`
    : 'No deleted users found on this page.';

  return (
    <TuiListScreen
      title={`Deleted Users (last ${lookbackDays} days`}
      pageLabel={`page ${currentIndex + 1}`}
      items={currentViewUsers}
      loading={loading}
      error={error}
      hasNextPage={localHasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectUser}
      formatLabel={formatDeletedUserLabel}
      getId={(user) => user.userEmail}
      filterSlot={(
        <Box flexShrink={0} marginBottom={1}>
          <TuiSearchControls
            appliedSearch={appliedSearch}
            searchDraft={searchDraft}
            isEditing={isEditingSearch}
            onDraftChange={setSearchDraft}
            onSubmit={applySearch}
          />
        </Box>
      )}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      blocked={blocked}
    />
  );
}