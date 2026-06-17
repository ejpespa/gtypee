import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { resolveNamedExportPath } from '../tui/download.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { googleSheetUrl } from '../tui/resourceLinks.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
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
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailSheetId, setDetailSheetId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      sheetsDeps.listSheets({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      }),
    [sheetsDeps],
  );

  const {
    items: currentSheets,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'sheets-list',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Sheets', 'Spreadsheets']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — preview spreadsheet',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleSheets = filterItemsByQuery(
    currentSheets,
    appliedSearch,
    (sheet) => [sheet.name, sheet.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailSheetId(null);
  }, [detail, actions]);

  const handleSelectSheet = useCallback(async (id: string) => {
    const summary = visibleSheets.find((s) => s.id === id);
    actions.resetStatus();
    setDetailSheetId(id);

    await detail.open({
      title: `${summary?.name || 'Spreadsheet'} (${DEFAULT_PREVIEW_RANGE})`,
      load: async () => {
        const result = await sheetsDeps.readRange(id, DEFAULT_PREVIEW_RANGE);
        return textToDetailLines(formatSheetsRead(result, 'human'));
      },
    });
  }, [actions, detail, sheetsDeps, visibleSheets]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailSheetId || !detail.title) return [];

    return mergeDetailActions(actions.runAction, {
      resourceId: detailSheetId,
      openUrl: googleSheetUrl(detailSheetId),
      actions: [{
        key: 'd',
        label: `export as ${DEFAULT_SHEET_EXPORT_FORMAT}`,
        onAction: () => actions.runAction(async () => {
          const outputPath = resolveNamedExportPath(detail.title!, DEFAULT_SHEET_EXPORT_FORMAT);
          const result = await sheetsDeps.exportSheet(detailSheetId, DEFAULT_SHEET_EXPORT_FORMAT, outputPath);
          if (!result.exported) {
            throw new Error(`Export failed for ${detail.title}`);
          }
          return `Exported to ${result.path}`;
        }),
      }],
    });
  }, [actions, detail.title, detailSheetId, sheetsDeps]);

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
        title={detail.title ?? 'Spreadsheet'}
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

  const emptyMessage = visibleSheets.length === 0 && currentSheets.length > 0 && appliedSearch
    ? `No spreadsheets match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No spreadsheets found on this page.';

  return (
    <TuiListScreen
      title="Sheets"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleSheets}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectSheet}
      formatLabel={formatSheetLabel}
      getId={(sheet) => sheet.id}
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