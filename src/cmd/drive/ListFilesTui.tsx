import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
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
import { mergeDetailActions } from '../tui/detailActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { driveFileUrl } from '../tui/resourceLinks.js';
import { normalizeDriveSearchQuery } from '../../googleapi/drive.js';
import { formatDriveFileInfo } from './commands.js';
import type { DriveCommandDeps, DriveFileInfo, DriveFileSummary } from './commands.js';

export interface ListFilesTuiProps {
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

export function ListFilesTui({
  driveDeps,
  title,
  onCancel,
}: ListFilesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [apiQueryDraft, setApiQueryDraft] = useState('');
  const [appliedApiQuery, setAppliedApiQuery] = useState('');
  const [isEditingApiQuery, setIsEditingApiQuery] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailFile, setDetailFile] = useState<DriveFileInfo | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      const paginationOpts = {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      };

      if (!appliedApiQuery) {
        return driveDeps.listFiles(paginationOpts);
      }

      return driveDeps.searchFiles(
        normalizeDriveSearchQuery(appliedApiQuery),
        paginationOpts,
      );
    },
    [appliedApiQuery, driveDeps],
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
    queryKey: appliedApiQuery,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Drive', title]);
    setHelpLines([
      'q — edit Drive query (empty lists all, text searches)',
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view file',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const applyApiQuery = useCallback(() => {
    setAppliedApiQuery(apiQueryDraft.trim());
    setIsEditingApiQuery(false);
  }, [apiQueryDraft]);

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

    const fileActions: TuiDetailAction[] = [];
    if (!isFolder) {
      const exportFormat = resolveDefaultDriveExportFormat(detailFile.mimeType);
      const label = isWorkspaceFile ? `export as ${exportFormat}` : 'download';

      fileActions.push({
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
      });
    }

    return mergeDetailActions(actions.runAction, {
      resourceId: detailFile.id,
      openUrl: driveFileUrl(detailFile.id),
      actions: fileActions,
    });
  }, [actions, detailFile, driveDeps]);

  const editing = isEditingApiQuery || isEditingSearch;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
      if (key.escape) {
        if (isEditingApiQuery) {
          setApiQueryDraft(appliedApiQuery);
          setIsEditingApiQuery(false);
        }
        if (isEditingSearch) {
          setSearchDraft(appliedSearch);
          setIsEditingSearch(false);
        }
      }
      return;
    }

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
      return;
    }

    if (input === 'q') {
      setIsEditingApiQuery(true);
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

  const filterSlot = (
    <>
      <Box marginBottom={1}>
        <Text color={isEditingApiQuery ? 'cyan' : 'gray'}>Drive query: </Text>
        {isEditingApiQuery ? (
          <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
        ) : (
          <>
            <Text color="green">{appliedApiQuery || '(all files)'}</Text>
            <Text color="gray"> · q to edit · plain text or Drive query · Enter to apply</Text>
          </>
        )}
      </Box>
      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={isEditingSearch}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
      />
    </>
  );

  const emptyMessage = visibleFiles.length === 0 && currentFiles.length > 0 && appliedSearch
    ? `No files match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No files found on this page.';

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