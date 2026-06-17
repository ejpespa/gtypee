import React, { useCallback, useEffect, useMemo } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatGmailDraftDetail } from './commands.js';
import type { GmailDraftDeps, GmailDraftSummary } from './commands.js';

export interface ListDraftsTuiProps {
  draftDeps: Required<GmailDraftDeps>;
  title: string;
  onCancel?: () => void;
}

function truncate(text: string, max = 40): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function formatDraftLabel(draft: GmailDraftSummary): string {
  const subject = draft.message.subject || '(no subject)';
  const messageId = draft.message.id ? ` · msg ${truncate(draft.message.id, 20)}` : '';
  return `${subject}${messageId}`;
}

export function ListDraftsTui({
  draftDeps,
  title,
  onCancel,
}: ListDraftsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!draftDeps.listDrafts) {
        throw new Error('listDrafts dependency function is not provided.');
      }
      return draftDeps.listDrafts({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [draftDeps],
  );

  const {
    items: currentDrafts,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'gmail-drafts',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Gmail', title]);
    setHelpLines([
      'r — refresh list',
      'Enter — view draft',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
  }, [detail, actions]);

  const handleSelectDraft = useCallback(async (id: string) => {
    const summary = currentDrafts.find((d) => d.id === id);
    actions.resetStatus();

    await detail.open({
      title: summary?.message.subject || 'Draft',
      load: async () => {
        if (!draftDeps.getDraft) {
          throw new Error('getDraft dependency function is not provided.');
        }
        const draft = await draftDeps.getDraft(id);
        return textToDetailLines(formatGmailDraftDetail(draft, 'human'));
      },
    });
  }, [actions, currentDrafts, detail, draftDeps]);

  const blocked = detail.isOpen;

  useInput((_input, key) => {
    if (detail.isOpen) return;

    if (key.escape) {
      onCancel?.();
    }
  });

  const detailActions = useMemo(() => [], []);

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Draft'}
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

  return (
    <TuiListScreen
      title={title}
      pageLabel={`Page ${currentIndex + 1}`}
      items={currentDrafts}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectDraft}
      formatLabel={formatDraftLabel}
      getId={(draft) => draft.id}
      emptyMessage="No drafts found on this page."
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}