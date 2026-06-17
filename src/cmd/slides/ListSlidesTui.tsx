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
import { googleSlidesUrl } from '../tui/resourceLinks.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatSlidesList } from './commands.js';
import type { PresentationSummary, SlidesCommandDeps } from './commands.js';

const DEFAULT_SLIDES_EXPORT_FORMAT = 'pptx';

export interface ListSlidesTuiProps {
  slidesDeps: Required<SlidesCommandDeps>;
  onCancel?: () => void;
}

function formatPresentationLabel(presentation: PresentationSummary): string {
  return presentation.name || presentation.id;
}

export function ListSlidesTui({ slidesDeps, onCancel }: ListSlidesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailPresentationId, setDetailPresentationId] = useState<string | null>(null);
  const [detailPresentationName, setDetailPresentationName] = useState('');

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      slidesDeps.listPresentations({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      }),
    [slidesDeps],
  );

  const {
    items: currentPresentations,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'slides-list',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Slides', 'Presentations']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view slides',
      'd — export as pptx (in detail)',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visiblePresentations = filterItemsByQuery(
    currentPresentations,
    appliedSearch,
    (presentation) => [presentation.name, presentation.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailPresentationId(null);
    setDetailPresentationName('');
  }, [detail, actions]);

  const handleSelectPresentation = useCallback(async (id: string) => {
    const summary = visiblePresentations.find((p) => p.id === id);
    actions.resetStatus();
    setDetailPresentationId(id);
    setDetailPresentationName(summary?.name || 'Presentation');

    await detail.open({
      title: summary?.name || 'Presentation',
      load: async () => {
        const slides = await slidesDeps.listSlides(id);
        return textToDetailLines(formatSlidesList(slides, 'human'));
      },
    });
  }, [actions, detail, slidesDeps, visiblePresentations]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailPresentationId || !detail.title) return [];

    return mergeDetailActions(actions.runAction, {
      resourceId: detailPresentationId,
      openUrl: googleSlidesUrl(detailPresentationId),
      actions: [{
        key: 'd',
        label: `export as ${DEFAULT_SLIDES_EXPORT_FORMAT}`,
        onAction: () => actions.runAction(async () => {
          const outputPath = resolveNamedExportPath(
            detailPresentationName || detailPresentationId,
            DEFAULT_SLIDES_EXPORT_FORMAT,
          );
          const result = await slidesDeps.exportSlides(
            detailPresentationId,
            DEFAULT_SLIDES_EXPORT_FORMAT,
          );
          if (!result.exported) {
            throw new Error(`Export failed for ${detailPresentationName || detailPresentationId}`);
          }
          return `Exported to ${result.path || outputPath}`;
        }),
      }],
    });
  }, [actions, detail.title, detailPresentationId, detailPresentationName, slidesDeps]);

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
        title={detail.title ?? 'Presentation'}
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

  const emptyMessage = visiblePresentations.length === 0 && currentPresentations.length > 0 && appliedSearch
    ? `No presentations match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No presentations found on this page.';

  return (
    <TuiListScreen
      title="Slides"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visiblePresentations}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectPresentation}
      formatLabel={formatPresentationLabel}
      getId={(presentation) => presentation.id}
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