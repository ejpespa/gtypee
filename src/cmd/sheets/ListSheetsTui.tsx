import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
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
import type { SheetsCommandDeps, SheetsSummary } from './commands.js';

export interface ListSheetsTuiProps {
  sheetsDeps: Required<SheetsCommandDeps>;
  onCancel?: () => void;
}

function formatSheetLabel(sheet: SheetsSummary): string {
  return sheet.name || sheet.id;
}

export function ListSheetsTui({ sheetsDeps, onCancel }: ListSheetsTuiProps) {
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, SheetsSummary[]>>({});

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
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
        const currentToken = pageHistory[currentIndex];
        const result = await sheetsDeps.listSheets({
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });

        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch spreadsheets');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, sheetsDeps, pageCache, pageHistory]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentSheets = pageCache[currentIndex] ?? [];
  const visibleSheets = filterItemsByQuery(
    currentSheets,
    appliedSearch,
    (sheet) => [sheet.name, sheet.id],
  );

  useInput((input, key) => {
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
        <Text bold color="cyan">Sheets (Page {currentIndex + 1})</Text>
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

      {loading && currentSheets.length === 0 ? (
        <Text color="yellow">Loading spreadsheets...</Text>
      ) : currentSheets.length === 0 ? (
        <Text color="gray">No spreadsheets found on this page.</Text>
      ) : visibleSheets.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No spreadsheets match "${appliedSearch}" on this page. Try Next → or clear search.`
            : 'No spreadsheets found on this page.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleSheets.map((sheet) => ({
              label: formatSheetLabel(sheet),
              value: sheet.id,
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