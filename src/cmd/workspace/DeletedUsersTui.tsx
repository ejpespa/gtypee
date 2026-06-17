import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { WorkspaceReportCommandDeps, DeletedUser, DeletedUserOptions, WorkspaceUserCommandDeps } from './commands.js';

export interface DeletedUsersTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  days: number;
  searchOpts?: DeletedUserOptions;
  onCancel?: () => void;
}

export function DeletedUsersTui({
  reportDeps,
  userDeps,
  days,
  searchOpts = {},
  onCancel,
}: DeletedUsersTuiProps) {
  const { exit } = useApp();

  const [searchDraft, setSearchDraft] = useState(searchOpts.query ?? '');
  const [appliedSearch, setAppliedSearch] = useState(searchOpts.query ?? '');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentViewUsers, setCurrentViewUsers] = useState<DeletedUser[]>([]);
  const [selectedUserToRecover, setSelectedUserToRecover] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const pageSize = searchOpts.pageSize || DEFAULT_TUI_PAGE_SIZE;

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setCurrentViewUsers([]);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    let isCancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentToken = pageHistory[currentIndex];
        const queryOpts: DeletedUserOptions = {
          ...searchOpts,
          pageSize,
          ...(appliedSearch ? { query: appliedSearch } : {}),
        };
        if (currentToken) {
          queryOpts.pageToken = currentToken;
        } else {
          delete queryOpts.pageToken;
        }

        const result = await reportDeps.getDeletedUsers(days, queryOpts);

        if (!isCancelled) {
          setCurrentViewUsers(result.items);
          setPageHistory((prev) =>
            mergeNextPageToken(prev, currentIndex, result.nextPageToken),
          );
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch users');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { isCancelled = true; };
  }, [currentIndex, days, reportDeps, appliedSearch, pageSize, searchOpts]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);

  const handleSelectUser = (item: { value: string }) => {
    setSelectedUserToRecover(item.value);
    setRecoveryStatus(null);
    setConfirmInput('');
  };

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

  useInput((input, key) => {
    if (isEditingSearch) {
      if (key.escape) {
        setSearchDraft(appliedSearch);
        setIsEditingSearch(false);
      }
      return;
    }

    if (selectedUserToRecover !== null) {
      if (key.escape) {
        setSelectedUserToRecover(null);
        setRecoveryStatus(null);
        setConfirmInput('');
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

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text bold color="cyan">
          Deleted Users (last {days} days · page {currentIndex + 1})
        </Text>
      </Box>

      <Box flexShrink={0}>
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
        />
      </Box>

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {selectedUserToRecover !== null ? (
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
        ) : loading && currentViewUsers.length === 0 ? (
          <Text color="yellow">Loading records from Google Workspace API...</Text>
        ) : currentViewUsers.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No deleted users match "${appliedSearch}" on this page.`
              : 'No deleted users found on this page.'}
          </Text>
        ) : (
          <SelectInput
            items={currentViewUsers.map((u) => {
              const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
              const namePart = fullName ? ` · ${fullName}` : '';
              const label = `ID: ${u.userEmail}${namePart} · deleted ${u.deletionTime}`;
              return { label, value: u.userEmail };
            })}
            onSelect={handleSelectUser}
          />
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={localHasNextPage}
        loading={loading}
      />
    </Box>
  );
}