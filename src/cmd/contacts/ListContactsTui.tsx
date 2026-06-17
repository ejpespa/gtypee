import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { ContactsCommandDeps, ContactSummary } from './commands.js';

export interface ListContactsTuiProps {
  contactsDeps: Required<ContactsCommandDeps>;
  title: string;
  mode: 'list' | 'search';
  onCancel?: () => void;
}

function formatContactLabel(contact: ContactSummary): string {
  return contact.email ? `${contact.email}` : contact.resourceName;
}

export function ListContactsTui({
  contactsDeps,
  title,
  mode,
  onCancel,
}: ListContactsTuiProps) {
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
  const [pageCache, setPageCache] = useState<Record<number, ContactSummary[]>>({});
  const [searchResults, setSearchResults] = useState<ContactSummary[]>([]);

  const applyApiQuery = useCallback(() => {
    setAppliedApiQuery(apiQueryDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
    setSearchResults([]);
    setIsEditingApiQuery(false);
  }, [apiQueryDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    if (mode === 'search') {
      setCurrentIndex(0);
    }
    setIsEditingSearch(false);
  }, [searchDraft, mode]);

  useEffect(() => {
    if (mode === 'search' && !appliedApiQuery) {
      setLoading(false);
      setError(null);
      return;
    }

    if (mode === 'list' && pageCache[currentIndex]) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'list') {
          const currentToken = pageHistory[currentIndex];
          const result = await contactsDeps.listContacts({
            pageSize: DEFAULT_TUI_PAGE_SIZE,
            ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
          });
          if (cancelled) return;
          setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
          setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
        } else {
          const results = await contactsDeps.searchContacts(appliedApiQuery);
          if (cancelled) return;
          setSearchResults(results);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => { cancelled = true; };
  }, [mode, appliedApiQuery, contactsDeps, currentIndex, pageCache, pageHistory]);

  const listHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const listContacts = pageCache[currentIndex] ?? [];

  const filteredListContacts = filterItemsByQuery(
    listContacts,
    appliedSearch,
    (c) => [c.email, c.resourceName],
  );

  const filteredSearchContacts = filterItemsByQuery(
    searchResults,
    appliedSearch,
    (c) => [c.email, c.resourceName],
  );

  const { slice: searchSlice, hasNextPage: searchHasNextPage } = sliceLocalPage(
    filteredSearchContacts,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const visibleContacts = mode === 'list' ? filteredListContacts : searchSlice;
  const hasNextPage = mode === 'list' ? listHasNextPage : searchHasNextPage;

  useInput((input, key) => {
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

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (mode === 'search' && input === 'q' && !isEditingApiQuery) {
      setIsEditingApiQuery(true);
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  const showEmptyApiPrompt = mode === 'search' && !appliedApiQuery;

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">{title} (Page {currentIndex + 1})</Text>
      </Box>

      {mode === 'search' && (
        <Box marginBottom={1}>
          <Text color="gray">API query: </Text>
          {isEditingApiQuery ? (
            <TextInput value={apiQueryDraft} onChange={setApiQueryDraft} onSubmit={applyApiQuery} />
          ) : (
            <Text>
              {appliedApiQuery || '(none)'}
              <Text color="gray"> (press q to set)</Text>
            </Text>
          )}
        </Box>
      )}

      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={isEditingSearch}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
      />

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}

      {showEmptyApiPrompt ? (
        <Text color="gray">Enter an API search query (press q) to find contacts.</Text>
      ) : loading && visibleContacts.length === 0 ? (
        <Text color="yellow">Loading contacts...</Text>
      ) : visibleContacts.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No contacts match "${appliedSearch}" on this page.`
            : 'No contacts found.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleContacts.map((contact) => ({
              label: formatContactLabel(contact),
              value: contact.resourceName,
            }))}
            onSelect={() => {}}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <TuiListFooter
          currentIndex={currentIndex}
          hasNextPage={hasNextPage}
          loading={loading}
          backHint="ESC to return"
        />
      </Box>
    </Box>
  );
}