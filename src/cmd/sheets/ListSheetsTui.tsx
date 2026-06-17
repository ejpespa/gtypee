import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { textToDetailLines } from '../tui/detail.js';
import { resolveNamedExportPath } from '../tui/download.js';
import { formatSheetsRead } from './commands.js';
import type { SheetsCommandDeps, SheetsSummary } from './commands.js';

const DEFAULT_PREVIEW_RANGE = 'A1:J20';
const DEFAULT_SHEET_EXPORT_FORMAT = 'xlsx';

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

  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailLines, setDetailLines] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSheetId, setDetailSheetId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const clearDetail = useCallback(() => {
    setDetailTitle(null);
    setDetailLines([]);
    setDetailLoading(false);
    setDetailError(null);
    setDetailSheetId(null);
    setActionStatus(null);
    setActionBusy(false);
  }, []);

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

  const handleSelectSheet = useCallback(async (item: { value: string }) => {
    const summary = visibleSheets.find((s) => s.id === item.value);
    setDetailTitle(summary?.name || 'Spreadsheet');
    setDetailLines([]);
    setDetailError(null);
    setDetailSheetId(item.value);
    setActionStatus(null);
    setDetailLoading(true);

    try {
      const result = await sheetsDeps.readRange(item.value, DEFAULT_PREVIEW_RANGE);
      setDetailLines(textToDetailLines(formatSheetsRead(result, 'human')));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to read spreadsheet');
    } finally {
      setDetailLoading(false);
    }
  }, [sheetsDeps, visibleSheets]);

  const runDetailAction = useCallback(async (action: () => Promise<string>) => {
    setActionBusy(true);
    setActionStatus(null);
    try {
      const message = await action();
      setActionStatus(message);
    } catch (err: unknown) {
      setActionStatus(`Error: ${err instanceof Error ? err.message : 'Export failed'}`);
    } finally {
      setActionBusy(false);
    }
  }, []);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailSheetId || !detailTitle) return [];

    return [{
      key: 'd',
      label: `export as ${DEFAULT_SHEET_EXPORT_FORMAT}`,
      onAction: () => runDetailAction(async () => {
        const outputPath = resolveNamedExportPath(detailTitle, DEFAULT_SHEET_EXPORT_FORMAT);
        const result = await sheetsDeps.exportSheet(detailSheetId, DEFAULT_SHEET_EXPORT_FORMAT, outputPath);
        if (!result.exported) {
          throw new Error(`Export failed for ${detailTitle}`);
        }
        return `Exported to ${result.path}`;
      }),
    }];
  }, [detailSheetId, detailTitle, sheetsDeps, runDetailAction]);

  const inDetail = detailTitle !== null || detailLoading || detailError !== null;

  useInput((input, key) => {
    if (inDetail) return;

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

  if (inDetail) {
    return (
      <TuiDetailPanel
        title={`${detailTitle ?? 'Spreadsheet'} (${DEFAULT_PREVIEW_RANGE})`}
        lines={detailLines}
        loading={detailLoading}
        error={detailError}
        onBack={clearDetail}
        actions={detailActions}
        actionStatus={actionStatus}
        actionBusy={actionBusy}
      />
    );
  }

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
            onSelect={handleSelectSheet}
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