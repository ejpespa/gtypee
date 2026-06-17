import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { WorkspaceUserCommandDeps, WorkspaceUser } from './commands.js';

export interface InactiveUsersTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  days?: number;
  onCancel?: () => void;
}

function userKey(user: WorkspaceUser, index: number): string {
  return `${user.id}-${user.primaryEmail}-${index}`;
}

export function InactiveUsersTui({ userDeps, days = 365, onCancel }: InactiveUsersTuiProps) {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [neverOnly, setNeverOnly] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    userDeps.listInactiveUsers(days, neverOnly)
      .then((items) => {
        if (!active) return;
        setUsers(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve inactive users');
        setLoading(false);
      });

    return () => { active = false; };
  }, [userDeps, days, neverOnly]);

  const filteredUsers = filterItemsByQuery(
    users,
    appliedSearch,
    (user) => [
      user.primaryEmail,
      user.name.givenName,
      user.name.familyName,
      user.orgUnitPath,
    ],
  );

  const { slice: visibleUsers, hasNextPage } = sliceLocalPage(
    filteredUsers,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / DEFAULT_TUI_PAGE_SIZE));

  const headerLabel = neverOnly
    ? 'Users who have never signed in'
    : `Inactive users (no login in ${days} days)`;

  useInput((input, key) => {
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

    if (input === 'n') {
      setNeverOnly((prev) => !prev);
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

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text bold color="cyan">
          {headerLabel}
          {!loading && filteredUsers.length > 0
            ? ` (${filteredUsers.length} total · page ${currentIndex + 1}/${totalPages})`
            : ''}
        </Text>
      </Box>

      <Box flexShrink={0} marginBottom={1}>
        <Text color="gray">
          Filter:{' '}
          <Text color={neverOnly ? 'yellow' : 'green'}>
            {neverOnly ? 'never signed in only' : `inactive ≥ ${days} days`}
          </Text>
          {' · press '}
          <Text color="cyan">n</Text>
          {' to toggle'}
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
          <Text color="yellow">Loading inactive users...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : users.length === 0 ? (
          <Text color="gray">
            {neverOnly
              ? 'No users found who have never signed in.'
              : `No inactive users found (threshold: ${days} days).`}
          </Text>
        ) : filteredUsers.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No users match "${appliedSearch}". Clear search to see all results.`
              : 'No inactive users found.'}
          </Text>
        ) : (
          visibleUsers.map((user, index) => {
            const susTag = user.suspended ? ' [SUSPENDED]' : '';
            const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ');
            const lastLogin = user.lastLoginTime ?? 'never';
            return (
              <Box key={userKey(user, index)} marginBottom={0}>
                <Text wrap="wrap">
                  <Text color="green">{user.primaryEmail}</Text>
                  {susTag ? <Text color="yellow">{susTag}</Text> : null}
                  {fullName ? <Text color="gray"> — {fullName}</Text> : null}
                  <Text color="gray">  {lastLogin}  {user.orgUnitPath}</Text>
                </Text>
              </Box>
            );
          })
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