import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE, sliceLocalPage } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatPeopleMe } from './commands.js';
import type { PeopleCommandDeps, PersonProfile } from './commands.js';

export interface ListPeopleTuiProps {
  peopleDeps: Required<PeopleCommandDeps>;
  onCancel?: () => void;
}

function formatPersonLabel(person: PersonProfile): string {
  if (person.email) {
    return `${person.displayName || person.email} <${person.email}>`;
  }
  return person.displayName || person.resourceName || 'Unknown';
}

function personKey(person: PersonProfile): string {
  return person.resourceName || person.email || person.displayName;
}

export function ListPeopleTui({ peopleDeps, onCancel }: ListPeopleTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [apiQueryDraft, setApiQueryDraft] = useState('');
  const [appliedApiQuery, setAppliedApiQuery] = useState('');
  const [isEditingApiQuery, setIsEditingApiQuery] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailPerson, setDetailPerson] = useState<PersonProfile | null>(null);

  const usingSearch = !!appliedApiQuery;

  const fetchAll = useCallback(
    () => peopleDeps.search(appliedApiQuery),
    [peopleDeps, appliedApiQuery],
  );

  const local = useLocalPaginatedList({
    fetchAll,
    queryKey: appliedApiQuery,
    enabled: usingSearch,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['People', 'Search']);
    setHelpLines([
      'q — edit search query (email or name)',
      '/ or s — filter current page',
      'r — refresh results',
      'Enter — view person',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applyApiQuery = useCallback(() => {
    setAppliedApiQuery(apiQueryDraft.trim());
    setIsEditingApiQuery(false);
  }, [apiQueryDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    if (usingSearch) {
      local.setCurrentIndex(0);
    }
    setIsEditingSearch(false);
  }, [searchDraft, usingSearch, local.setCurrentIndex]);

  const filteredPeople = filterItemsByQuery(
    local.allItems,
    appliedSearch,
    (person) => [person.displayName, person.email, person.resourceName ?? ''],
  );

  const { slice: visiblePeople, hasNextPage } = sliceLocalPage(
    filteredPeople,
    local.currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailPerson(null);
  }, [detail, actions]);

  const handleSelectPerson = useCallback(async (key: string) => {
    const summary = visiblePeople.find((p) => personKey(p) === key);
    actions.resetStatus();
    setDetailPerson(null);

    await detail.open({
      title: summary?.displayName || summary?.email || 'Person',
      load: async () => {
        let person = summary;
        if (person?.resourceName) {
          person = await peopleDeps.getPerson(person.resourceName);
        } else if (person?.email) {
          const results = await peopleDeps.search(person.email);
          person = results[0] ?? person;
        }
        if (!person) {
          throw new Error('Person not found');
        }
        setDetailPerson(person);
        return formatPeopleMe(person, 'human').split('\n');
      },
    });
  }, [actions, detail, peopleDeps, visiblePeople]);

  const detailActions = useMemo(() => {
    if (!detailPerson) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailPerson.resourceName ?? detailPerson.email,
    });
  }, [actions.runAction, detailPerson]);

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

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (input === 'q') {
      setIsEditingApiQuery(true);
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Person'}
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
        <Text color={isEditingApiQuery ? 'cyan' : 'gray'}>Search: </Text>
        {isEditingApiQuery ? (
          <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
        ) : (
          <>
            <Text color="green">{appliedApiQuery || '(enter email or name with q)'}</Text>
            <Text color="gray"> · q to edit · Enter to apply</Text>
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

  const emptyMessage = !usingSearch
    ? 'Press q to enter an email or name to search.'
    : visiblePeople.length === 0 && filteredPeople.length > 0 && appliedSearch
      ? `No people match "${appliedSearch}" on this page. Try Next → or clear search.`
      : 'No people found for this query.';

  return (
    <TuiListScreen
      title="People"
      pageLabel={usingSearch ? `Page ${local.currentIndex + 1}` : 'Search'}
      items={visiblePeople}
      loading={usingSearch ? local.loading : false}
      error={usingSearch ? local.error : null}
      hasNextPage={hasNextPage}
      currentIndex={local.currentIndex}
      onSelect={handleSelectPerson}
      formatLabel={formatPersonLabel}
      getId={personKey}
      filterSlot={filterSlot}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) local.setCurrentIndex((i) => i + 1);
        if (action === 'prev' && local.currentIndex > 0) local.setCurrentIndex((i) => i - 1);
      }}
      onRefresh={local.refresh}
      blocked={blocked}
    />
  );
}