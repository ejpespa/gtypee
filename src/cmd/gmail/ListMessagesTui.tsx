import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { GmailCommandDeps, GmailMessageSummary } from './commands.js';

export interface ListMessagesTuiProps {
  gmailDeps: Required<GmailCommandDeps>;
  title: string;
  defaultQuery?: string;
  onCancel?: () => void;
}

function truncate(text: string, max = 40): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function formatMessageLabel(message: GmailMessageSummary): string {
  const subject = message.subject || '(no subject)';
  const fromPart = message.from ? ` · ${truncate(message.from, 30)}` : '';
  const tail = message.snippet || message.date || '';
  const tailPart = tail ? ` · ${truncate(tail)}` : '';
  return `${subject}${fromPart}${tailPart}`;
}

export function ListMessagesTui({
  gmailDeps,
  title,
  defaultQuery = '',
  onCancel,
}: ListMessagesTuiProps) {
  const [queryDraft, setQueryDraft] = useState(defaultQuery);
  const [appliedQuery, setAppliedQuery] = useState(defaultQuery);
  const [isEditingQuery, setIsEditingQuery] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<{ [page: number]: GmailMessageSummary[] }>({});

  const applyQuery = useCallback(() => {
    setAppliedQuery(queryDraft.trim());
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
    setIsEditingQuery(false);
  }, [queryDraft]);

  useEffect(() => {
    if (pageCache[currentIndex]) return;

    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!gmailDeps.listMessages) {
          throw new Error('listMessages dependency function is not provided.');
        }
        const currentToken = pageHistory[currentIndex];
        const result = await gmailDeps.listMessages(appliedQuery || undefined, {
          pageSize: DEFAULT_TUI_PAGE_SIZE,
          ...(currentToken !== undefined ? { pageToken: currentToken } : {}),
        });
        if (cancelled) return;

        setPageCache((prev) => ({ ...prev, [currentIndex]: result.items }));
        setPageHistory((prev) => mergeNextPageToken(prev, currentIndex, result.nextPageToken));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => { cancelled = true; };
  }, [currentIndex, gmailDeps, pageCache, pageHistory, appliedQuery]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentMessages = pageCache[currentIndex] ?? [];

  useInput((input, key) => {
    if (isEditingQuery) {
      if (key.escape) {
        setQueryDraft(appliedQuery);
        setIsEditingQuery(false);
      }
      return;
    }

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingQuery(true);
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          {title} (Page {currentIndex + 1})
        </Text>
        <Text>
          <Text color="gray">Query: </Text>
          <Text color="green">{appliedQuery || '(none)'}</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={isEditingQuery ? 'cyan' : 'gray'}>Gmail query: </Text>
        {isEditingQuery ? (
          <TextInput value={queryDraft} onChange={setQueryDraft} onSubmit={applyQuery} />
        ) : (
          <Text color="gray">press / or s to edit · Enter to apply</Text>
        )}
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading && currentMessages.length === 0 ? (
        <Text color="yellow">Loading messages from Gmail API...</Text>
      ) : currentMessages.length === 0 ? (
        <Text color="gray">No messages found for this query on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1} flexGrow={1}>
          <SelectInput
            items={currentMessages.map((message) => ({
              label: formatMessageLabel(message),
              value: message.id,
            }))}
            onSelect={() => {}}
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