import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { WorkspaceGroupCommandDeps, GroupInfo } from './commands.js';

export interface ListGroupsTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

export function ListGroupsTui({ groupDeps, onCancel }: ListGroupsTuiProps) {
  const { exit } = useApp();
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<{ [page: number]: GroupInfo[] }>({});

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    if (pageCache[currentIndex]) return;

    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!groupDeps.listGroups) {
          throw new Error('listGroups dependency function is not provided.');
        }
        const currentToken = pageHistory[currentIndex];
        const result = await groupDeps.listGroups({
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });
        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch groups');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, groupDeps, pageCache, pageHistory]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentGroups = pageCache[currentIndex] ?? [];
  const visibleGroups = filterItemsByQuery(
    currentGroups,
    appliedSearch,
    (g) => [g.email, g.name],
  );

  useInput((input, key) => {
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

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Groups (Page {currentIndex + 1})</Text>
      </Box>

      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={isEditingSearch}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
      />

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}

      {loading && currentGroups.length === 0 ? (
        <Text color="yellow">Loading groups from Google Workspace API...</Text>
      ) : currentGroups.length === 0 ? (
        <Text color="gray">No groups found on this page.</Text>
      ) : visibleGroups.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No groups match "${appliedSearch}" on this page. Try Next → or clear search.`
            : 'No groups found on this page.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleGroups.map((g) => ({
              label: `${g.name} <${g.email}>`,
              value: g.id,
            }))}
            onSelect={() => {}}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <TuiListFooter
          currentIndex={currentIndex}
          hasNextPage={localHasNextPage}
          loading={loading}
          backHint="press 'q' or ESC to return"
        />
      </Box>
    </Box>
  );
}