import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatKeepNotes } from './commands.js';
import type { KeepCommandDeps, KeepNote } from './commands.js';

export interface ListKeepTuiProps {
  keepDeps: Required<KeepCommandDeps>;
  onCancel?: () => void;
}

function formatNoteLabel(note: KeepNote): string {
  return note.title || note.id;
}

export function ListKeepTui({ keepDeps, onCancel }: ListKeepTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailNoteId, setDetailNoteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    await keepDeps.ensureWorkspace();
    return keepDeps.listNotes();
  }, [keepDeps]);

  const {
    items: currentNotes,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: 'keep-notes',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Keep', 'Notes']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — read note',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleNotes = filterItemsByQuery(
    currentNotes,
    appliedSearch,
    (note) => [note.title, note.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailNoteId(null);
  }, [detail, actions]);

  const handleSelectNote = useCallback(async (id: string) => {
    const summary = visibleNotes.find((n) => n.id === id);
    actions.resetStatus();
    setDetailNoteId(id);

    await detail.open({
      title: summary?.title || 'Note',
      load: async () => {
        await keepDeps.ensureWorkspace();
        const note = await keepDeps.getNote(id);
        const lines = formatKeepNotes([note], 'human').split('\n');
        if (note.body) {
          lines.push('', note.body);
        }
        return textToDetailLines(lines.join('\n'));
      },
    });
  }, [actions, detail, keepDeps, visibleNotes]);

  const detailActions = useMemo(() => {
    if (!detailNoteId) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailNoteId,
    });
  }, [actions.runAction, detailNoteId]);

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
        title={detail.title ?? 'Note'}
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

  const emptyMessage = visibleNotes.length === 0 && currentNotes.length > 0 && appliedSearch
    ? `No notes match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No notes found.';

  return (
    <TuiListScreen
      title="Keep"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleNotes}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectNote}
      formatLabel={formatNoteLabel}
      getId={(note) => note.id}
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