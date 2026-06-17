import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
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
import { textToDetailLines } from '../tui/detail.js';
import { formatDocsReadResult } from './commands.js';
import type { DocsCommandDeps, DocsSummary } from './commands.js';

export interface ListDocsTuiProps {
  docsDeps: Required<DocsCommandDeps>;
  onCancel?: () => void;
}

function formatDocLabel(doc: DocsSummary): string {
  return doc.name || doc.id;
}

export function ListDocsTui({ docsDeps, onCancel }: ListDocsTuiProps) {
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<Record<number, DocsSummary[]>>({});

  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailLines, setDetailLines] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const clearDetail = useCallback(() => {
    setDetailTitle(null);
    setDetailLines([]);
    setDetailLoading(false);
    setDetailError(null);
  }, []);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    if (pageCache[currentIndex]) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentToken = pageHistory[currentIndex];
        const result = await docsDeps.listDocs({
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });

        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch documents');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, docsDeps, pageCache, pageHistory]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentDocs = pageCache[currentIndex] ?? [];
  const visibleDocs = filterItemsByQuery(
    currentDocs,
    appliedSearch,
    (doc) => [doc.name, doc.id],
  );

  const handleSelectDoc = useCallback(async (item: { value: string }) => {
    const summary = visibleDocs.find((d) => d.id === item.value);
    setDetailTitle(summary?.name || 'Document');
    setDetailLines([]);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const result = await docsDeps.readDoc(item.value);
      setDetailLines(textToDetailLines(formatDocsReadResult(result, 'human')));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to read document');
    } finally {
      setDetailLoading(false);
    }
  }, [docsDeps, visibleDocs]);

  const inDetail = detailTitle !== null || detailLoading || detailError !== null;

  useInput((input, key) => {
    if (inDetail) return;

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
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  if (inDetail) {
    return (
      <TuiDetailPanel
        title={detailTitle ?? 'Document'}
        lines={detailLines}
        loading={detailLoading}
        error={detailError}
        onBack={clearDetail}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Docs (Page {currentIndex + 1})</Text>
      </Box>

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

      {loading && currentDocs.length === 0 ? (
        <Text color="yellow">Loading documents...</Text>
      ) : currentDocs.length === 0 ? (
        <Text color="gray">No documents found on this page.</Text>
      ) : visibleDocs.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No documents match "${appliedSearch}" on this page. Try Next → or clear search.`
            : 'No documents found on this page.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleDocs.map((doc) => ({
              label: formatDocLabel(doc),
              value: doc.id,
            }))}
            onSelect={handleSelectDoc}
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