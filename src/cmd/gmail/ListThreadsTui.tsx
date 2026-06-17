import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { gmailThreadUrl } from '../tui/resourceLinks.js';
import { formatGmailThreadDetail } from './commands.js';
import type { GmailThreadDeps, GmailThreadSummary } from './commands.js';

export interface ListThreadsTuiProps {
  threadDeps: Required<GmailThreadDeps>;
  title: string;
  defaultQuery?: string;
  onCancel?: () => void;
}

function truncate(text: string, max = 50): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function formatThreadLabel(thread: GmailThreadSummary): string {
  const snippet = thread.snippet ? ` · ${truncate(thread.snippet)}` : '';
  return `${thread.messageCount} message(s)${snippet}`;
}

export function ListThreadsTui({
  threadDeps,
  title,
  defaultQuery = '',
  onCancel,
}: ListThreadsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [queryDraft, setQueryDraft] = useState(defaultQuery);
  const [appliedQuery, setAppliedQuery] = useState(defaultQuery);
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [detailThreadId, setDetailThreadId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!threadDeps.listThreads) {
        throw new Error('listThreads dependency function is not provided.');
      }
      return threadDeps.listThreads(appliedQuery || undefined, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [threadDeps, appliedQuery],
  );

  const {
    items: currentThreads,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: appliedQuery,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Gmail', title]);
    setHelpLines([
      '/ or s — edit Gmail query',
      'r — refresh list',
      'Enter — view thread',
      'o — open thread in browser (detail view)',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const applyQuery = useCallback(() => {
    setAppliedQuery(queryDraft.trim());
    setIsEditingQuery(false);
  }, [queryDraft]);

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailThreadId(null);
  }, [detail, actions]);

  const handleSelectThread = useCallback(async (id: string) => {
    const summary = currentThreads.find((t) => t.id === id);
    actions.resetStatus();
    setDetailThreadId(id);

    await detail.open({
      title: summary ? `Thread (${summary.messageCount} messages)` : 'Thread',
      load: async () => {
        if (!threadDeps.getThread) {
          throw new Error('getThread dependency function is not provided.');
        }
        const thread = await threadDeps.getThread(id);
        return textToDetailLines(formatGmailThreadDetail(thread, 'human'));
      },
    });
  }, [actions, currentThreads, detail, threadDeps]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailThreadId) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailThreadId,
      openUrl: gmailThreadUrl(detailThreadId),
    });
  }, [actions.runAction, detailThreadId]);

  const editing = isEditingQuery;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
      if (key.escape) {
        setQueryDraft(appliedQuery);
        setIsEditingQuery(false);
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingQuery(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Thread'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

  const filterSlot = (
    <Box marginBottom={1}>
      <Text color={isEditingQuery ? 'cyan' : 'gray'}>Gmail query: </Text>
      {isEditingQuery ? (
        <TextInput value={queryDraft} onChange={setQueryDraft} onSubmit={applyQuery} />
      ) : (
        <>
          <Text color="green">{appliedQuery || '(none)'}</Text>
          <Text color="gray"> · / or s to edit · Enter to apply</Text>
        </>
      )}
    </Box>
  );

  return (
    <TuiListScreen
      title={title}
      pageLabel={`Page ${currentIndex + 1}`}
      items={currentThreads}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectThread}
      formatLabel={formatThreadLabel}
      getId={(thread) => thread.id}
      filterSlot={filterSlot}
      emptyMessage="No threads found for this query on this page."
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}