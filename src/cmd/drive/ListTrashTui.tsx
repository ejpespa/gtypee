import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import {
  isGoogleAppsFile,
  resolveDefaultDriveExportFormat,
  resolveNamedExportPath,
  sanitizeFilename,
} from '../tui/download.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatDriveFileInfo } from './commands.js';
import type { DriveCommandDeps, DriveFileInfo, DriveFileSummary, DriveTrashDeps } from './commands.js';

export interface ListTrashTuiProps {
  trashDeps: Required<DriveTrashDeps>;
  driveDeps: Required<DriveCommandDeps>;
  title: string;
  onCancel?: () => void;
}

function truncateMime(mimeType: string, max = 36): string {
  if (mimeType.length <= max) return mimeType;
  return `${mimeType.slice(0, max - 3)}...`;
}

function formatFileLabel(file: DriveFileSummary): string {
  return `${file.name} · ${truncateMime(file.mimeType)}`;
}

export function ListTrashTui({
  trashDeps,
  driveDeps,
  title,
  onCancel,
}: ListTrashTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailFile, setDetailFile] = useState<DriveFileInfo | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!trashDeps.listTrash) {
        throw new Error('listTrash dependency function is not provided.');
      }
      return trashDeps.listTrash({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [trashDeps],
  );

  const {
    items: currentFiles,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'drive-trash',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Drive', title]);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view file',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleFiles = filterItemsByQuery(
    currentFiles,
    appliedSearch,
    (file) => [file.name, file.mimeType],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailFile(null);
  }, [detail, actions]);

  const handleSelectFile = useCallback(async (id: string) => {
    const summary = visibleFiles.find((f) => f.id === id);
    actions.resetStatus();
    setDetailFile(null);

    await detail.open({
      title: summary?.name || 'File',
      load: async () => {
        const info = await driveDeps.getFileInfo(id);
        setDetailFile(info);
        return textToDetailLines(formatDriveFileInfo(info, 'human'));
      },
    });
  }, [actions, detail, driveDeps, visibleFiles]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailFile) return [];

    const isWorkspaceFile = isGoogleAppsFile(detailFile.mimeType);
    const isFolder = detailFile.mimeType === 'application/vnd.google-apps.folder';
    if (isFolder) return [];

    const exportFormat = resolveDefaultDriveExportFormat(detailFile.mimeType);
    const label = isWorkspaceFile ? `export as ${exportFormat}` : 'download';

    return [{
      key: 'd',
      label,
      onAction: () => actions.runAction(async () => {
        if (isWorkspaceFile) {
          const outputPath = resolveNamedExportPath(detailFile.name, exportFormat);
          const result = await driveDeps.exportFile(detailFile.id, exportFormat, outputPath);
          if (!result.exported) {
            throw new Error(`Export failed for ${detailFile.name}`);
          }
          return `Exported to ${result.path}`;
        }

        const outputPath = sanitizeFilename(detailFile.name);
        const result = await driveDeps.downloadFile(detailFile.id, outputPath);
        if (!result.downloaded) {
          throw new Error(`Download failed for ${detailFile.name}`);
        }
        return `Saved to ${result.path}`;
      }),
    }];
  }, [actions, detailFile, driveDeps]);

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
        title={detail.title ?? 'File'}
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

  const emptyMessage = visibleFiles.length === 0 && currentFiles.length > 0 && appliedSearch
    ? `No trashed files match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No trashed files found on this page.';

  return (
    <TuiListScreen
      title={title}
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleFiles}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectFile}
      formatLabel={formatFileLabel}
      getId={(file) => file.id}
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