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
import { TuiWizard } from '../tui/TuiWizard.js';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { driveFileUrl } from '../tui/resourceLinks.js';
import { DRIVE_FOLDER_MIME, normalizeDriveSearchQuery } from '../../googleapi/drive.js';
import { formatDriveFileInfo } from './commands.js';
import type { DriveCommandDeps, DriveFileInfo, DriveFileSummary } from './commands.js';

export interface ListFilesTuiProps {
  driveDeps: Required<DriveCommandDeps>;
  title: string;
  onCancel?: () => void;
}

type FolderFrame = {
  id: string;
  name: string;
};

const ROOT_FOLDER: FolderFrame = { id: 'root', name: 'My Drive' };

function truncateMime(mimeType: string, max = 36): string {
  if (mimeType.length <= max) return mimeType;
  return `${mimeType.slice(0, max - 3)}...`;
}

function isDriveFolder(file: DriveFileSummary): boolean {
  return file.mimeType === DRIVE_FOLDER_MIME;
}

function formatFileLabel(file: DriveFileSummary): string {
  const prefix = isDriveFolder(file) ? '[folder] ' : '';
  return `${prefix}${file.name} · ${truncateMime(file.mimeType)}`;
}

export function ListFilesTui({
  driveDeps,
  title,
  onCancel,
}: ListFilesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [folderStack, setFolderStack] = useState<FolderFrame[]>([ROOT_FOLDER]);
  const currentFolder = folderStack[folderStack.length - 1]!;

  const [apiQueryDraft, setApiQueryDraft] = useState('');
  const [appliedApiQuery, setAppliedApiQuery] = useState('');
  const [isEditingApiQuery, setIsEditingApiQuery] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailFile, setDetailFile] = useState<DriveFileInfo | null>(null);
  const [writeMode, setWriteMode] = useState<'share' | 'trash' | null>(null);

  const browseMode = !appliedApiQuery;

  const listQueryKey = browseMode
    ? `folder:${currentFolder.id}`
    : `search:${appliedApiQuery}`;

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      const paginationOpts = {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      };

      if (!browseMode) {
        return driveDeps.searchFiles(
          normalizeDriveSearchQuery(appliedApiQuery),
          paginationOpts,
        );
      }

      return driveDeps.listFiles({
        ...paginationOpts,
        parentId: currentFolder.id,
      });
    },
    [appliedApiQuery, browseMode, currentFolder.id, driveDeps],
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
    queryKey: listQueryKey,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  const folderPath = useMemo(
    () => folderStack.map((frame) => frame.name).join(' / '),
    [folderStack],
  );

  useEffect(() => {
    setBreadcrumbs(['Drive', title, ...folderStack.slice(1).map((frame) => frame.name)]);
    setHelpLines([
      browseMode ? 'Enter folder to open · Enter file for detail' : 'Search mode — q to clear query and browse folders',
      'q — edit Drive query (empty browses current folder)',
      '/ or s — filter current page',
      'r — refresh list',
      browseMode && folderStack.length > 1 ? 'ESC — up one folder' : 'ESC — back',
      'Detail: s share · t trash',
      '←/→ or Space — paginate',
    ]);
  }, [browseMode, folderStack, setBreadcrumbs, setHelpLines, title]);

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
    setWriteMode(null);
  }, [detail, actions]);

  const openFolder = useCallback((folder: DriveFileSummary) => {
    setFolderStack((stack) => [...stack, { id: folder.id, name: folder.name }]);
    setAppliedSearch('');
    setSearchDraft('');
  }, []);

  const goUpFolder = useCallback(() => {
    setFolderStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
    setAppliedSearch('');
    setSearchDraft('');
  }, []);

  const handleSelectFile = useCallback(async (id: string) => {
    const summary = visibleFiles.find((f) => f.id === id);
    if (!summary) return;

    if (browseMode && isDriveFolder(summary)) {
      openFolder(summary);
      return;
    }

    actions.resetStatus();
    setDetailFile(null);

    await detail.open({
      title: summary.name || 'File',
      load: async () => {
        const info = await driveDeps.getFileInfo(id);
        setDetailFile(info);
        return textToDetailLines(formatDriveFileInfo(info, 'human'));
      },
    });
  }, [actions, browseMode, detail, driveDeps, openFolder, visibleFiles]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailFile) return [];

    const isWorkspaceFile = isGoogleAppsFile(detailFile.mimeType);
    const isFolder = detailFile.mimeType === DRIVE_FOLDER_MIME;

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

    const mutationActions: TuiDetailAction[] = [
      {
        key: 's',
        label: 'share',
        onAction: () => setWriteMode('share'),
      },
      {
        key: 't',
        label: 'trash',
        onAction: () => setWriteMode('trash'),
      },
    ];

    if (isFolder && browseMode) {
      mutationActions.unshift({
        key: 'g',
        label: 'open folder',
        onAction: () => {
          openFolder({
            id: detailFile.id,
            name: detailFile.name,
            mimeType: detailFile.mimeType,
          });
          clearDetail();
        },
      });
    }

    return mergeDetailActions(actions.runAction, {
      resourceId: detailFile.id,
      openUrl: driveFileUrl(detailFile.id),
      actions: [...mutationActions, ...fileActions],
    });
  }, [actions, browseMode, clearDetail, detailFile, driveDeps, openFolder]);

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
      if (browseMode && folderStack.length > 1) {
        goUpFolder();
        return;
      }
      onCancel?.();
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
    if (writeMode === 'share' && detailFile) {
      return (
        <TuiWizard
          title={`Share ${detailFile.name}`}
          fields={[
            { key: 'email', label: 'Email', required: true, placeholder: 'user@example.com' },
            { key: 'role', label: 'Role (reader or writer)', required: true, initialValue: 'reader' },
          ]}
          summary={(values) => `Share ${detailFile.name} with ${values.email} as ${values.role}`}
          onCancel={() => setWriteMode(null)}
          onSubmit={async (values) => {
            const role = (values.role ?? 'reader').toLowerCase();
            if (role !== 'reader' && role !== 'writer') {
              throw new Error('Role must be reader or writer');
            }
            const result = await driveDeps.createPermission!(
              detailFile.id,
              values.email ?? '',
              role,
              'user',
            );
            if (!result.applied) throw new Error('Failed to share file');
            return `Shared with ${values.email} as ${role}`;
          }}
        />
      );
    }

    if (writeMode === 'trash' && detailFile) {
      return (
        <TuiConfirmPrompt
          title="Trash file"
          message={`Move "${detailFile.name}" to trash?`}
          destructive
          onCancel={() => setWriteMode(null)}
          onConfirm={() => actions.runAction(async () => {
            const result = await driveDeps.deleteFile!(detailFile.id, false);
            if (!result.deleted) throw new Error('Failed to trash file');
            clearDetail();
            refresh();
            return 'File moved to trash';
          })}
        />
      );
    }

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
      {browseMode && (
        <Box marginBottom={1}>
          <Text>
            <Text color="gray">Location: </Text>
            <Text color="green">{folderPath}</Text>
          </Text>
        </Box>
      )}
      <Box marginBottom={1}>
        <Text color={isEditingApiQuery ? 'cyan' : 'gray'}>Drive query: </Text>
        {isEditingApiQuery ? (
          <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
        ) : (
          <>
            <Text color="green">{appliedApiQuery || (browseMode ? '(browse folders)' : '(all files)')}</Text>
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
    : browseMode
      ? `No items in ${currentFolder.name} on this page.`
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