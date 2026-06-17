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
import type { WorkspaceReportCommandDeps, LoginActivity } from './commands.js';

export interface LoginAuditTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days?: number;
  onCancel?: () => void;
}

export function LoginAuditTui({ reportDeps, days = 30, onCancel }: LoginAuditTuiProps) {
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    reportDeps.getLoginAudit(days)
      .then((items) => {
        if (!active) return;
        setLogins(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve login audit');
        setLoading(false);
      });

    return () => { active = false; };
  }, [reportDeps, days]);

  const filteredLogins = filterItemsByQuery(
    logins,
    appliedSearch,
    (login) => [login.userEmail, login.ipAddress],
  );
  const { slice: currentViewLogins, hasNextPage } = sliceLocalPage(
    filteredLogins,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogins.length / DEFAULT_TUI_PAGE_SIZE));

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
          Login Audit (last {days} days)
          {!loading && filteredLogins.length > 0
            ? ` (${filteredLogins.length} total · page ${currentIndex + 1}/${totalPages})`
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
          hint="press / or s to edit · Enter to apply · ESC to cancel"
        />
      </Box>

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {loading ? (
          <Text color="yellow">Loading login audit...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : logins.length === 0 ? (
          <Text color="gray">No login activity found.</Text>
        ) : filteredLogins.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No logins match "${appliedSearch}". Try clearing search.`
              : 'No login activity found.'}
          </Text>
        ) : currentViewLogins.length === 0 ? (
          <Text color="gray">No logins on this page.</Text>
        ) : (
          currentViewLogins.map((login, index) => (
            <Box key={`${login.timestamp}-${login.userEmail}-${index}`} marginBottom={0}>
              <Text wrap="wrap">
                <Text color="green">{login.userEmail}</Text>
                <Text>  </Text>
                <Text color={login.success ? 'green' : 'red'}>
                  {login.success ? '✓' : '✗'}
                </Text>
                <Text>  {login.ipAddress}  {login.timestamp}</Text>
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