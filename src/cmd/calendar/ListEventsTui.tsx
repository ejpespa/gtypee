import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
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
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(undefined);
  const [appliedTo, setAppliedTo] = useState<string | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'from' | 'to' | 'search' | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, CalendarEventSummary[]>>({});

  const resetPagination = useCallback(() => {
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
  }, []);

  const applyFrom = useCallback(() => {
    const trimmed = fromDraft.trim();
    const newFrom = trimmed || undefined;
    if (newFrom !== appliedFrom) {
      setAppliedFrom(newFrom);
      resetPagination();
    }
    setActiveField(null);
  }, [fromDraft, appliedFrom, resetPagination]);

  const applyTo = useCallback(() => {
    const trimmed = toDraft.trim();
    const newTo = trimmed || undefined;
    if (newTo !== appliedTo) {
      setAppliedTo(newTo);
      resetPagination();
    }
    setActiveField(null);
  }, [toDraft, appliedTo, resetPagination]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [searchDraft]);

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
        if (!calendarDeps.listEvents) {
          throw new Error('listEvents dependency function is not provided.');
        }

        const currentToken = pageHistory[currentIndex];
        const query: { from?: string; to?: string } = {};
        if (appliedFrom !== undefined) query.from = appliedFrom;
        if (appliedTo !== undefined) query.to = appliedTo;

        const result = await calendarDeps.listEvents(query, {
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });

        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, calendarDeps, pageCache, pageHistory, appliedFrom, appliedTo]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentEvents = pageCache[currentIndex] ?? [];
  const visibleEvents = filterItemsByQuery(
    currentEvents,
    appliedSearch,
    (event) => [event.summary, event.id, event.start],
  );

  useInput((input, key) => {
    if (activeField !== null) {
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
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          Calendar Events (Page {currentIndex + 1})
        </Text>
      </Box>

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

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading && currentEvents.length === 0 ? (
        <Text color="yellow">Loading events from Calendar API...</Text>
      ) : currentEvents.length === 0 ? (
        <Text color="gray">No events found for this date range on this page.</Text>
      ) : visibleEvents.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No events match "${appliedSearch}" on this page. Try Next → or clear search.`
            : 'No events found on this page.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1} flexGrow={1}>
          <SelectInput
            items={visibleEvents.map((event) => ({
              label: formatEventLabel(event),
              value: event.id,
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
          backHint="ESC to return"
        />
      </Box>
    </Box>
  );
}