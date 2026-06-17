import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE, sliceLocalPage } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { ContactsCommandDeps, ContactSummary } from './commands.js';

export interface ListContactsTuiProps {
  contactsDeps: Required<ContactsCommandDeps>;
  onCancel?: () => void;
}

function formatContactLabel(contact: ContactSummary): string {
  return contact.email ? `${contact.email}` : contact.resourceName;
}

export function ListContactsTui({
  contactsDeps,
  onCancel,
}: ListContactsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [apiQueryDraft, setApiQueryDraft] = useState('');
  const [appliedApiQuery, setAppliedApiQuery] = useState('');
  const [isEditingApiQuery, setIsEditingApiQuery] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailContact, setDetailContact] = useState<ContactSummary | null>(null);

  const usingSearch = !!appliedApiQuery;

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      contactsDeps.listContacts({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      }),
    [contactsDeps],
  );

  const paginated = usePaginatedList({
    fetchPage,
    queryKey: 'contacts-list',
    enabled: !usingSearch,
  });

  const local = useLocalPaginatedList({
    fetchAll: () => contactsDeps.searchContacts(appliedApiQuery),
    queryKey: appliedApiQuery,
    enabled: usingSearch,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Contacts', 'Contacts']);
    setHelpLines([
      'q — edit API search query (empty lists all, text searches)',
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view contact',
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

  const listContacts = paginated.items;
  const filteredListContacts = filterItemsByQuery(
    listContacts,
    appliedSearch,
    (contact) => [contact.email, contact.resourceName],
  );

  const filteredSearchContacts = filterItemsByQuery(
    local.allItems,
    appliedSearch,
    (contact) => [contact.email, contact.resourceName],
  );

  const { slice: searchSlice, hasNextPage: searchHasNextPage } = sliceLocalPage(
    filteredSearchContacts,
    local.currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const visibleContacts = usingSearch ? searchSlice : filteredListContacts;
  const currentIndex = usingSearch ? local.currentIndex : paginated.currentIndex;
  const setCurrentIndex = usingSearch ? local.setCurrentIndex : paginated.setCurrentIndex;
  const hasNextPage = usingSearch ? searchHasNextPage : paginated.hasNextPage;
  const loading = usingSearch ? local.loading : paginated.loading;
  const error = usingSearch ? local.error : paginated.error;
  const refresh = usingSearch ? local.refresh : paginated.refresh;

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailContact(null);
  }, [detail, actions]);

  const handleSelectContact = useCallback(async (resourceName: string) => {
    const summary = visibleContacts.find((c) => c.resourceName === resourceName);
    actions.resetStatus();
    setDetailContact(null);

    await detail.open({
      title: summary?.email || summary?.resourceName || 'Contact',
      load: async () => {
        const contact = await contactsDeps.getContact(resourceName);
        setDetailContact(contact);
        return [
          `Resource: ${contact.resourceName}`,
          `Email: ${contact.email || '(none)'}`,
        ];
      },
    });
  }, [actions, contactsDeps, detail, visibleContacts]);

  const detailActions = useMemo(() => {
    if (!detailContact) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailContact.resourceName,
    });
  }, [actions.runAction, detailContact]);

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
        title={detail.title ?? 'Contact'}
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
        <Text color={isEditingApiQuery ? 'cyan' : 'gray'}>API query: </Text>
        {isEditingApiQuery ? (
          <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
        ) : (
          <>
            <Text color="green">{appliedApiQuery || '(all contacts)'}</Text>
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

  const emptyMessage = visibleContacts.length === 0 && (
    usingSearch
      ? filteredSearchContacts.length > 0
      : listContacts.length > 0
  ) && appliedSearch
    ? `No contacts match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No contacts found on this page.';

  return (
    <TuiListScreen
      title="Contacts"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleContacts}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectContact}
      formatLabel={formatContactLabel}
      getId={(contact) => contact.resourceName}
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