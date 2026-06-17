import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { DriveSharedDrivesDeps, SharedDriveSummary } from './commands.js';

export interface ListSharedDrivesTuiProps {
  sharedDrivesDeps: Required<DriveSharedDrivesDeps>;
  title: string;
  onCancel?: () => void;
}

function formatDriveLabel(drive: SharedDriveSummary): string {
  return drive.name || drive.id;
}

function formatSharedDriveDetail(drive: SharedDriveSummary): string {
  return [`ID: ${drive.id}`, `Name: ${drive.name}`].join('\n');
}

export function ListSharedDrivesTui({
  sharedDrivesDeps,
  title,
  onCancel,
}: ListSharedDrivesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailDriveId, setDetailDriveId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!sharedDrivesDeps.listSharedDrives) {
        throw new Error('listSharedDrives dependency function is not provided.');
      }
      return sharedDrivesDeps.listSharedDrives({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [sharedDrivesDeps],
  );

  const {
    items: currentDrives,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'drive-shared-drives',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Drive', title]);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view shared drive',
      'c — copy ID (detail view)',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleDrives = filterItemsByQuery(
    currentDrives,
    appliedSearch,
    (drive) => [drive.name, drive.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailDriveId(null);
  }, [detail, actions]);

  const handleSelectDrive = useCallback(async (id: string) => {
    const summary = visibleDrives.find((d) => d.id === id);
    actions.resetStatus();
    setDetailDriveId(id);

    await detail.open({
      title: summary?.name || 'Shared Drive',
      load: async () => {
        if (!sharedDrivesDeps.getSharedDrive) {
          throw new Error('getSharedDrive dependency function is not provided.');
        }
        const drive = await sharedDrivesDeps.getSharedDrive(id);
        return textToDetailLines(formatSharedDriveDetail(drive));
      },
    });
  }, [actions, detail, sharedDrivesDeps, visibleDrives]);

  const detailActions = useMemo(() => {
    if (!detailDriveId) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailDriveId,
    });
  }, [actions.runAction, detailDriveId]);

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

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Shared Drive'}
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

  const emptyMessage = visibleDrives.length === 0 && currentDrives.length > 0 && appliedSearch
    ? `No shared drives match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No shared drives found on this page.';

  return (
    <TuiListScreen
      title={title}
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleDrives}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectDrive}
      formatLabel={formatDriveLabel}
      getId={(drive) => drive.id}
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