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
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatDocsReadResult } from './commands.js';
import type { DocsCommandDeps, DocsSummary } from './commands.js';

const DEFAULT_DOC_EXPORT_FORMAT = 'pdf';

export interface ListDocsTuiProps {
  docsDeps: Required<DocsCommandDeps>;
  onCancel?: () => void;
}

function formatDocLabel(doc: DocsSummary): string {
  return doc.name || doc.id;
}

export function ListDocsTui({ docsDeps, onCancel }: ListDocsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailDocId, setDetailDocId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      docsDeps.listDocs({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      }),
    [docsDeps],
  );

  const {
    items: currentDocs,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'docs-list',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Docs', 'Documents']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — read document',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleDocs = filterItemsByQuery(
    currentDocs,
    appliedSearch,
    (doc) => [doc.name, doc.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailDocId(null);
  }, [detail, actions]);

  const handleSelectDoc = useCallback(async (id: string) => {
    const summary = visibleDocs.find((d) => d.id === id);
    actions.resetStatus();
    setDetailDocId(id);

    await detail.open({
      title: summary?.name || 'Document',
      load: async () => {
        const result = await docsDeps.readDoc(id);
        return textToDetailLines(formatDocsReadResult(result, 'human'));
      },
    });
  }, [actions, detail, docsDeps, visibleDocs]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailDocId || !detail.title) return [];

    return [{
      key: 'd',
      label: `export as ${DEFAULT_DOC_EXPORT_FORMAT}`,
      onAction: () => actions.runAction(async () => {
        const outputPath = resolveNamedExportPath(detail.title!, DEFAULT_DOC_EXPORT_FORMAT);
        const result = await docsDeps.exportDoc(detailDocId, DEFAULT_DOC_EXPORT_FORMAT, outputPath);
        if (!result.exported) {
          throw new Error(`Export failed for ${detail.title}`);
        }
        return `Exported to ${result.path}`;
      }),
    }];
  }, [actions, detail.title, detailDocId, docsDeps]);

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
        title={detail.title ?? 'Document'}
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

  const emptyMessage = visibleDocs.length === 0 && currentDocs.length > 0 && appliedSearch
    ? `No documents match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No documents found on this page.';

  return (
    <TuiListScreen
      title="Docs"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleDocs}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectDoc}
      formatLabel={formatDocLabel}
      getId={(doc) => doc.id}
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