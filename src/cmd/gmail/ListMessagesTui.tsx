import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { textToDetailLines } from '../tui/detail.js';
import { buildGmailListQuery } from '../tui/gmail-query.js';
import { formatGmailMessageDetail } from './commands.js';
import type {
  GmailAttachmentDeps,
  GmailCommandDeps,
  GmailMessageDetail,
  GmailMessageSummary,
} from './commands.js';

export interface ListMessagesTuiProps {
  gmailDeps: Required<GmailCommandDeps>;
  gmailAttachmentDeps: Required<GmailAttachmentDeps>;
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
  gmailAttachmentDeps,
  title,
  defaultQuery = '',
  onCancel,
}: ListMessagesTuiProps) {
  const [queryDraft, setQueryDraft] = useState(defaultQuery);
  const [appliedQuery, setAppliedQuery] = useState(defaultQuery);
  const [isEditingQuery, setIsEditingQuery] = useState(false);

  const [fromDraft, setFromDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [isEditingFrom, setIsEditingFrom] = useState(false);

  const effectiveQuery = useMemo(
    () => buildGmailListQuery(appliedQuery, appliedFrom),
    [appliedQuery, appliedFrom],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageCache, setPageCache] = useState<{ [page: number]: GmailMessageSummary[] }>({});

  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailLines, setDetailLines] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<GmailMessageDetail | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const clearDetail = useCallback(() => {
    setDetailTitle(null);
    setDetailLines([]);
    setDetailLoading(false);
    setDetailError(null);
    setDetailMessage(null);
    setActionStatus(null);
    setActionBusy(false);
  }, []);

  const resetPages = useCallback(() => {
    setPageHistory([undefined]);
    setCurrentIndex(0);
    setPageCache({});
  }, []);

  const applyQuery = useCallback(() => {
    setAppliedQuery(queryDraft.trim());
    resetPages();
    setIsEditingQuery(false);
  }, [queryDraft, resetPages]);

  const applyFrom = useCallback(() => {
    setAppliedFrom(fromDraft.trim());
    resetPages();
    setIsEditingFrom(false);
  }, [fromDraft, resetPages]);

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
        const result = await gmailDeps.listMessages(effectiveQuery || undefined, {
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
  }, [currentIndex, gmailDeps, pageCache, pageHistory, effectiveQuery]);

  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);
  const currentMessages = pageCache[currentIndex] ?? [];

  const handleSelectMessage = useCallback(async (item: { value: string }) => {
    const summary = currentMessages.find((m) => m.id === item.value);
    setDetailTitle(summary?.subject || 'Message');
    setDetailLines([]);
    setDetailError(null);
    setDetailMessage(null);
    setActionStatus(null);
    setDetailLoading(true);

    try {
      if (!gmailDeps.getMessage) {
        throw new Error('getMessage dependency function is not provided.');
      }
      const message = await gmailDeps.getMessage(item.value);
      setDetailMessage(message);
      setDetailLines(textToDetailLines(formatGmailMessageDetail(message, 'human')));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load message');
    } finally {
      setDetailLoading(false);
    }
  }, [gmailDeps, currentMessages]);

  const runDetailAction = useCallback(async (action: () => Promise<string>) => {
    setActionBusy(true);
    setActionStatus(null);
    try {
      const message = await action();
      setActionStatus(message);
    } catch (err: unknown) {
      setActionStatus(`Error: ${err instanceof Error ? err.message : 'Download failed'}`);
    } finally {
      setActionBusy(false);
    }
  }, []);

  const detailActions = useMemo((): TuiDetailAction[] => {
    const attachmentCount = detailMessage?.attachments.length ?? 0;
    if (attachmentCount === 0) return [];

    const actions: TuiDetailAction[] = [];
    if (attachmentCount === 1 && detailMessage) {
      const attachment = detailMessage.attachments[0]!;
      actions.push({
        key: 'd',
        label: 'download attachment',
        onAction: () => runDetailAction(async () => {
          const result = await gmailAttachmentDeps.downloadAttachment(
            detailMessage.id,
            attachment.attachmentId,
            attachment.filename,
          );
          if (!result.saved) {
            throw new Error(`Failed to save ${attachment.filename}`);
          }
          return `Saved ${attachment.filename} (${result.size} bytes)`;
        }),
      });
    } else if (detailMessage) {
      actions.push({
        key: 'd',
        label: 'download first attachment',
        onAction: () => runDetailAction(async () => {
          const attachment = detailMessage.attachments[0]!;
          const result = await gmailAttachmentDeps.downloadAttachment(
            detailMessage.id,
            attachment.attachmentId,
            attachment.filename,
          );
          if (!result.saved) {
            throw new Error(`Failed to save ${attachment.filename}`);
          }
          return `Saved ${attachment.filename} (${result.size} bytes)`;
        }),
      });
      actions.push({
        key: 'a',
        label: 'download all attachments',
        onAction: () => runDetailAction(async () => {
          const result = await gmailAttachmentDeps.downloadAllAttachments(detailMessage.id);
          if (result.downloaded === 0) {
            throw new Error('No attachments were saved');
          }
          return `Saved ${result.downloaded} attachment(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`;
        }),
      });
    }
    return actions;
  }, [detailMessage, gmailAttachmentDeps, runDetailAction]);

  const inDetail = detailTitle !== null || detailLoading || detailError !== null;

  useInput((input, key) => {
    if (inDetail) return;

    if (isEditingQuery || isEditingFrom) {
      if (key.escape) {
        if (isEditingQuery) {
          setQueryDraft(appliedQuery);
          setIsEditingQuery(false);
        }
        if (isEditingFrom) {
          setFromDraft(appliedFrom);
          setIsEditingFrom(false);
        }
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

    if (input === 'f') {
      setIsEditingFrom(true);
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
        title={detailTitle ?? 'Message'}
        lines={detailLines}
        loading={detailLoading}
        error={detailError}
        onBack={clearDetail}
        actions={detailActions}
        actionStatus={actionStatus}
        actionBusy={actionBusy}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          {title} (Page {currentIndex + 1})
        </Text>
        <Text>
          <Text color="gray">Query: </Text>
          <Text color="green">{effectiveQuery || '(none)'}</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={isEditingQuery ? 'cyan' : 'gray'}>Gmail query: </Text>
        {isEditingQuery ? (
          <TextInput value={queryDraft} onChange={setQueryDraft} onSubmit={applyQuery} />
        ) : (
          <>
            <Text color="green">{appliedQuery || '(none)'}</Text>
            <Text color="gray"> · / or s to edit</Text>
          </>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text color={isEditingFrom ? 'cyan' : 'gray'}>From: </Text>
        {isEditingFrom ? (
          <TextInput
            value={fromDraft}
            onChange={setFromDraft}
            onSubmit={applyFrom}
            placeholder="sample@adssu.edu.ph"
          />
        ) : (
          <>
            <Text color="green">{appliedFrom || '(any)'}</Text>
            <Text color="gray"> · f to filter by sender · Enter to apply</Text>
          </>
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
            onSelect={handleSelectMessage}
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