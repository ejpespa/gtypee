import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE, shouldHandlePaginationKey } from '../tui/pagination.js';
import { filterWorkspaceUsersByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceUserCommandDeps, WorkspaceUser } from './commands.js';

export interface ListUsersTuiProps {
  userDeps: WorkspaceUserCommandDeps;
  defaultOrgUnitPath?: string;
  onCancel?: () => void;
}

export function ListUsersTui({
  userDeps,
  defaultOrgUnitPath = '/Test',
  onCancel,
}: ListUsersTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [orgUnitDraft, setOrgUnitDraft] = useState(defaultOrgUnitPath);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState(normalizeOrgUnitPath(defaultOrgUnitPath));
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!userDeps.listUsers) {
        throw new Error('listUsers dependency function is not provided.');
      }
      return userDeps.listUsers(appliedOrgPath, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [appliedOrgPath, userDeps],
  );

  const {
    items: rawUsers,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: appliedOrgPath,
  });

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Users']);
    setHelpLines([
      'f or / — edit org unit',
      's — search current page',
      'r — refresh list',
      'Tab — switch field while editing',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applyFilters = useCallback(() => {
    setAppliedOrgPath(normalizeOrgUnitPath(orgUnitDraft));
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [orgUnitDraft, searchDraft]);

  const visibleUsers = filterWorkspaceUsersByQuery(rawUsers, appliedSearch);

  useInput((input, key) => {
    if (activeField !== null) {
      if (key.escape) {
        setActiveField(null);
        return;
      }
      if (key.tab) {
        setActiveField(activeField === 'org' ? 'search' : 'org');
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === 'r') {
      refresh();
      return;
    }

    if (input === 'f' || input === '/') {
      setActiveField('org');
      return;
    }

    if (input === 's') {
      setActiveField('search');
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
          Users in org {appliedOrgPath} (page {currentIndex + 1})
        </Text>
      </Box>

      <Box flexDirection="column" flexShrink={0} marginBottom={1}>
        <Box>
          <Text color={activeField === 'org' ? 'cyan' : 'gray'}>Org unit: </Text>
          {activeField === 'org' ? (
            <TextInput
              value={orgUnitDraft}
              onChange={setOrgUnitDraft}
              onSubmit={applyFilters}
            />
          ) : (
            <Text color="green">{orgUnitDraft || '/'}</Text>
          )}
        </Box>
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={activeField === 'search'}
          onDraftChange={setSearchDraft}
          onSubmit={applyFilters}
          hint="f or / = org unit · s = search · Enter applies · Tab switches field · ESC cancels edit · filters current page"
        />
      </Box>

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {error ? (
          <Text color="red">Error: {error}</Text>
        ) : loading && rawUsers.length === 0 ? (
          <Text color="yellow">Loading users from Google Workspace API...</Text>
        ) : rawUsers.length === 0 ? (
          <Text color="gray">No users found for {appliedOrgPath} on this page.</Text>
        ) : visibleUsers.length === 0 ? (
          <Text color="gray">
            No users match &quot;{appliedSearch}&quot; on this page. Try Next → or clear search.
          </Text>
        ) : (
          visibleUsers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={hasNextPage}
        loading={loading}
        backHint="r refresh · ESC to return"
      />
    </Box>
  );
}

function UserRow({ user }: { user: WorkspaceUser }) {
  const adminTag = user.isAdmin ? ' [ADMIN]' : '';
  const susTag = user.suspended ? ' [SUSPENDED]' : '';
  const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ');

  return (
    <Box marginBottom={0}>
      <Text wrap="wrap">
        <Text color="green">{user.primaryEmail}</Text>
        {adminTag || susTag ? <Text color="yellow">{adminTag}{susTag}</Text> : null}
        {fullName ? <Text color="gray"> — {fullName}</Text> : null}
      </Text>
    </Box>
  );
}