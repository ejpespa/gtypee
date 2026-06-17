import React, { useCallback, useEffect, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceGroupCommandDeps, GroupInfo } from './commands.js';

export interface ListGroupsTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onCancel?: () => void;
}

function formatGroupLabel(group: GroupInfo): string {
  return `${group.name} <${group.email}>`;
}

export function ListGroupsTui({ groupDeps, onCancel }: ListGroupsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!groupDeps.listGroups) {
        throw new Error('listGroups dependency function is not provided.');
      }
      return groupDeps.listGroups({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [groupDeps],
  );

  const {
    items: currentGroups,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'workspace-groups',
  });

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Groups']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleGroups = filterItemsByQuery(
    currentGroups,
    appliedSearch,
    (g) => [g.email, g.name],
  );

  const blocked = isEditingSearch;

  useInput((input, key) => {
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

  const emptyMessage = visibleGroups.length === 0 && currentGroups.length > 0 && appliedSearch
    ? `No groups match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No groups found on this page.';

  return (
    <TuiListScreen
      title="Workspace Admin: Groups"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleGroups}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={() => {}}
      formatLabel={formatGroupLabel}
      getId={(group) => group.id}
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