import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { calendarEventUrl } from '../tui/resourceLinks.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { CalendarCommandDeps, CalendarEventSummary } from '../calendar/commands.js';

export interface ListMeetTuiProps {
  calendarDeps: Required<CalendarCommandDeps>;
  onCancel?: () => void;
}

function formatEventLabel(event: CalendarEventSummary): string {
  const title = event.summary || '(no title)';
  const start = event.start || 'unknown';
  return `${start}  ${title}`;
}

function upcomingFromIso(): string {
  return new Date().toISOString();
}

export function ListMeetTui({ calendarDeps, onCancel }: ListMeetTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      calendarDeps.listEvents(
        { from: upcomingFromIso() },
        {
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(pageToken !== undefined ? { pageToken } : {}),
        },
      ),
    [calendarDeps],
  );

  const {
    items: currentEvents,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'meet-upcoming',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Meet', 'Upcoming']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view meeting',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleEvents = filterItemsByQuery(
    currentEvents,
    appliedSearch,
    (event) => [event.summary, event.start, event.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailEventId(null);
  }, [detail, actions]);

  const handleSelectEvent = useCallback(async (id: string) => {
    const summary = visibleEvents.find((e) => e.id === id);
    actions.resetStatus();
    setDetailEventId(id);

    await detail.open({
      title: summary?.summary || 'Meeting',
      load: async () => [
        `Title: ${summary?.summary || '(no title)'}`,
        `Start: ${summary?.start || 'unknown'}`,
        `Event ID: ${id}`,
      ],
    });
  }, [actions, detail, visibleEvents]);

  const detailActions = useMemo(() => {
    if (!detailEventId) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailEventId,
      openUrl: calendarEventUrl(detailEventId),
    });
  }, [actions.runAction, detailEventId]);

  const blocked = isEditingSearch || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (isEditingSearch) {
      if (key.escape) {
        setSearchDraft(appliedSearch);
        setIsEditingSearch(false);
      }
      return;
    }

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Meeting'}
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

  const emptyMessage = visibleEvents.length === 0 && currentEvents.length > 0 && appliedSearch
    ? `No meetings match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No upcoming meetings found.';

  return (
    <TuiListScreen
      title="Meet"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleEvents}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectEvent}
      formatLabel={formatEventLabel}
      getId={(event) => event.id}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
        />
      )}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}