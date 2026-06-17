import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { textToDetailLines } from '../tui/detail.js';
import {
  isGoogleAppsFile,
  resolveDefaultDriveExportFormat,
  resolveNamedExportPath,
  sanitizeFilename,
} from '../tui/download.js';
import { normalizeDriveSearchQuery } from '../../googleapi/drive.js';
import { formatDriveFileInfo } from './commands.js';
import type { DriveCommandDeps, DriveFileInfo, DriveFileSummary } from './commands.js';

export interface ListFilesTuiProps {
  driveDeps: Required<DriveCommandDeps>;
  title: string;
  mode: 'list' | 'search';
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
  mode,
  onCancel,
}: ListFilesTuiProps) {
  const [apiQueryDraft, setApiQueryDraft] = useState('');
  const [appliedApiQuery, setAppliedApiQuery] = useState('');
  const [isEditingApiQuery, setIsEditingApiQuery] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<{ [page: number]: DriveFileSummary[] }>({});

  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailLines, setDetailLines] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailFile, setDetailFile] = useState<DriveFileInfo | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const clearDetail = useCallback(() => {
    setDetailTitle(null);
    setDetailLines([]);
    setDetailLoading(false);
    setDetailError(null);
    setDetailFile(null);
    setActionStatus(null);
    setActionBusy(false);
  }, []);

  const applyApiQuery = useCallback(() => {
    setAppliedApiQuery(apiQueryDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
    setIsEditingApiQuery(false);
  }, [apiQueryDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    if (mode === 'search' && !appliedApiQuery) {
      setLoading(false);
      setError(null);
      return;
    }

    if (pageCache[currentIndex]) return;

    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentToken = pageHistory[currentIndex];
        const paginationOpts = {
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        };

        const result =
          mode === 'list'
            ? await driveDeps.listFiles(paginationOpts)
            : await driveDeps.searchFiles(
                normalizeDriveSearchQuery(appliedApiQuery),
                paginationOpts,
              );

        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch files');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, driveDeps, pageCache, pageHistory, mode, appliedApiQuery]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentFiles = pageCache[currentIndex] ?? [];
  const visibleFiles = filterItemsByQuery(
    currentFiles,
    appliedSearch,
    (file) => [file.name, file.mimeType],
  );

  const handleSelectFile = useCallback(async (item: { value: string }) => {
    const summary = visibleFiles.find((f) => f.id === item.value);
    setDetailTitle(summary?.name || 'File');
    setDetailLines([]);
    setDetailError(null);
    setDetailFile(null);
    setActionStatus(null);
    setDetailLoading(true);

    try {
      const info = await driveDeps.getFileInfo(item.value);
      setDetailFile(info);
      setDetailLines(textToDetailLines(formatDriveFileInfo(info, 'human')));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load file info');
    } finally {
      setDetailLoading(false);
    }
  }, [driveDeps, visibleFiles]);

  const runDetailAction = useCallback(async (action: () => Promise<string>) => {
    setActionBusy(true);
    setActionStatus(null);
    try {
      const message = await action();
      setActionStatus(message);
    } catch (err: unknown) {
      setActionStatus(`Error: ${err instanceof Error ? err.message : 'Download failed'}`);
    } finally {
      setActionBusy(false);
    }
  }, []);

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
      onAction: () => runDetailAction(async () => {
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
  }, [detailFile, driveDeps, runDetailAction]);

  const inDetail = detailTitle !== null || detailLoading || detailError !== null;

  useInput((input, key) => {
    if (inDetail) return;

    if (isEditingApiQuery || isEditingSearch) {
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

    if (mode === 'search' && input === 'q') {
      setIsEditingApiQuery(true);
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  const awaitingSearchQuery = mode === 'search' && !appliedApiQuery;

  if (inDetail) {
    return (
      <TuiDetailPanel
        title={detailTitle ?? 'File'}
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
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          {title} (Page {currentIndex + 1})
        </Text>
      </Box>

      {mode === 'search' && (
        <Box marginBottom={1}>
          <Text color={isEditingApiQuery ? 'cyan' : 'gray'}>Drive query: </Text>
          {isEditingApiQuery ? (
            <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
          ) : (
            <>
              <Text color="green">{appliedApiQuery || '(none)'}</Text>
              <Text color="gray"> · q to edit · plain text or Drive query · Enter to apply</Text>
            </>
          )}
        </Box>
      )}

      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={isEditingSearch}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
        hint="filters current page by name/mimeType"
      />

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {awaitingSearchQuery ? (
        <Text color="gray">Enter a Drive search query and press Enter to fetch files.</Text>
      ) : loading && currentFiles.length === 0 ? (
        <Text color="yellow">Loading files from Drive API...</Text>
      ) : currentFiles.length === 0 ? (
        <Text color="gray">No files found on this page.</Text>
      ) : visibleFiles.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No files match "${appliedSearch}" on this page. Try Next → or clear search.`
            : 'No files found on this page.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1} flexGrow={1}>
          <SelectInput
            items={visibleFiles.map((file) => ({
              label: formatFileLabel(file),
              value: file.id,
            }))}
            onSelect={handleSelectFile}
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