import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterWorkspaceUsersByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
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
  const [orgUnitDraft, setOrgUnitDraft] = useState(defaultOrgUnitPath);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState(normalizeOrgUnitPath(defaultOrgUnitPath));
  const [appliedSearch, setAppliedSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, WorkspaceUser[]>>({});
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);

  const applyFilters = useCallback(() => {
    setAppliedOrgPath(normalizeOrgUnitPath(orgUnitDraft));
    setAppliedSearch(searchDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
    setActiveField(null);
  }, [orgUnitDraft, searchDraft]);

  useEffect(() => {
    if (pageCache[currentIndex]) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userDeps.listUsers) {
          throw new Error('listUsers dependency function is not provided.');
        }

        const currentToken = pageHistory[currentIndex];
        const result = await userDeps.listUsers(appliedOrgPath, {
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });

        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch users');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, appliedOrgPath, userDeps, pageCache, pageHistory]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const rawUsers = pageCache[currentIndex] ?? [];
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
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
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
          visibleUsers.map((user) => {
            const adminTag = user.isAdmin ? ' [ADMIN]' : '';
            const susTag = user.suspended ? ' [SUSPENDED]' : '';
            const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ');
            return (
              <Box key={user.id} marginBottom={0}>
                <Text wrap="wrap">
                  <Text color="green">{user.primaryEmail}</Text>
                  {adminTag || susTag ? <Text color="yellow">{adminTag}{susTag}</Text> : null}
                  {fullName ? <Text color="gray"> — {fullName}</Text> : null}
                </Text>
              </Box>
            );
          })
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