import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import type { WorkspaceGroupCommandDeps, GroupInfo } from './commands.js';

export interface ListGroupsTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

export function ListGroupsTui({ groupDeps, onCancel }: ListGroupsTuiProps) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<{ [page: number]: GroupInfo[] }>({});

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

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (onCancel) return onCancel();
      exit();
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

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}

      {loading && currentGroups.length === 0 ? (
        <Text color="yellow">Loading groups from Google Workspace API...</Text>
      ) : currentGroups.length === 0 ? (
        <Text color="gray">No groups found on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={currentGroups.map((g) => ({
              label: `${g.name} <${g.email}>`,
              value: g.id,
            }))}
            onSelect={() => {}}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Navigation: </Text>
        <Text color={currentIndex > 0 && !loading ? 'green' : 'gray'}>[← Prev]</Text>
        <Text color="gray">  </Text>
        <Text color={localHasNextPage && !loading ? 'green' : 'gray'}>[Next →]</Text>
        <Text color="gray"> | press 'q' or ESC to return{loading ? ' | Loading...' : ''}</Text>
      </Box>
    </Box>
  );
}