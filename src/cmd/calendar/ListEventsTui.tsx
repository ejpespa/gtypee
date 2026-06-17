import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { calendarEventUrl } from '../tui/resourceLinks.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { CalendarCommandDeps, CalendarEventSummary } from './commands.js';

export interface ListEventsTuiProps {
  calendarDeps: Required<CalendarCommandDeps>;
  onCancel?: () => void;
}

function formatEventLabel(event: CalendarEventSummary): string {
  const title = event.summary || '(no title)';
  const start = event.start || 'unknown';
  return `${start}  ${title}`;
}

export function ListEventsTui({ calendarDeps, onCancel }: ListEventsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(undefined);
  const [appliedTo, setAppliedTo] = useState<string | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'from' | 'to' | 'search' | null>(null);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const dateQueryKey = useMemo(
    () => `${appliedFrom ?? ''}|${appliedTo ?? ''}`,
    [appliedFrom, appliedTo],
  );

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!calendarDeps.listEvents) {
        throw new Error('listEvents dependency function is not provided.');
      }

      const query: { from?: string; to?: string } = {};
      if (appliedFrom !== undefined) query.from = appliedFrom;
      if (appliedTo !== undefined) query.to = appliedTo;

      return calendarDeps.listEvents(query, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [calendarDeps, appliedFrom, appliedTo],
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
    queryKey: dateQueryKey,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Calendar', 'Events']);
    setHelpLines([
      'f — filter from date',
      't — filter to date',
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view event',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applyFrom = useCallback(() => {
    const trimmed = fromDraft.trim();
    setAppliedFrom(trimmed || undefined);
    setActiveField(null);
  }, [fromDraft]);

  const applyTo = useCallback(() => {
    const trimmed = toDraft.trim();
    setAppliedTo(trimmed || undefined);
    setActiveField(null);
  }, [toDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [searchDraft]);

  const visibleEvents = filterItemsByQuery(
    currentEvents,
    appliedSearch,
    (event) => [event.summary, event.id, event.start],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailEventId(null);
  }, [detail, actions]);

  const handleSelectEvent = useCallback(async (id: string) => {
    const event = visibleEvents.find((e) => e.id === id);
    if (!event) return;
    actions.resetStatus();
    setDetailEventId(id);

    await detail.open({
      title: event.summary || 'Event',
      load: async () => [
        `ID: ${event.id}`,
        `Summary: ${event.summary || '(no title)'}`,
        `Start: ${event.start || 'unknown'}`,
      ],
    });
  }, [actions, detail, visibleEvents]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailEventId) return [];

    return mergeDetailActions(actions.runAction, {
      resourceId: detailEventId,
      openUrl: calendarEventUrl(detailEventId),
    });
  }, [actions.runAction, detailEventId]);

  const editing = activeField !== null;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
      if (key.escape) {
        if (activeField === 'from') setFromDraft(appliedFrom ?? '');
        if (activeField === 'to') setToDraft(appliedTo ?? '');
        if (activeField === 'search') setSearchDraft(appliedSearch);
        setActiveField(null);
      }
      return;
    }

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (input === 'f') {
      setActiveField('from');
      return;
    }
    if (input === 't') {
      setActiveField('to');
      return;
    }
    if (input === '/' || input === 's') {
      setActiveField('search');
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Event'}
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
    <>
      <Box marginBottom={1}>
        <Text color={activeField === 'from' ? 'cyan' : 'gray'}>From: </Text>
        {activeField === 'from' ? (
          <TextInput value={fromDraft} onChange={setFromDraft} onSubmit={applyFrom} />
        ) : (
          <Text color="green">{appliedFrom || '(none)'}</Text>
        )}
        <Text color="gray"> · press f to edit · Enter to apply</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={activeField === 'to' ? 'cyan' : 'gray'}>To: </Text>
        {activeField === 'to' ? (
          <TextInput value={toDraft} onChange={setToDraft} onSubmit={applyTo} />
        ) : (
          <Text color="green">{appliedTo || '(none)'}</Text>
        )}
        <Text color="gray"> · press t to edit · Enter to apply</Text>
      </Box>

      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={activeField === 'search'}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
        hint="press / or s to edit · Enter to apply · filters current page"
      />
    </>
  );

  const emptyMessage = visibleEvents.length === 0 && currentEvents.length > 0 && appliedSearch
    ? `No events match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No events found for this date range on this page.';

  return (
    <TuiListScreen
      title="Calendar Events"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleEvents}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectEvent}
      formatLabel={formatEventLabel}
      getId={(event) => event.id}
      filterSlot={filterSlot}
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