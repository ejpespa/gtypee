import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { textToDetailLines } from '../tui/detail.js';
import { buildGmailListQuery } from '../tui/gmail-query.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { gmailMessageUrl } from '../tui/resourceLinks.js';
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
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [queryDraft, setQueryDraft] = useState(defaultQuery);
  const [appliedQuery, setAppliedQuery] = useState(defaultQuery);
  const [isEditingQuery, setIsEditingQuery] = useState(false);

  const [fromDraft, setFromDraft] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [isEditingFrom, setIsEditingFrom] = useState(false);

  const [detailMessage, setDetailMessage] = useState<GmailMessageDetail | null>(null);

  const effectiveQuery = useMemo(
    () => buildGmailListQuery(appliedQuery, appliedFrom),
    [appliedQuery, appliedFrom],
  );

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!gmailDeps.listMessages) {
        throw new Error('listMessages dependency function is not provided.');
      }
      return gmailDeps.listMessages(effectiveQuery || undefined, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [gmailDeps, effectiveQuery],
  );

  const {
    items: currentMessages,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: effectiveQuery,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Gmail', title]);
    setHelpLines([
      '/ or s — edit Gmail query',
      'f — filter by sender',
      'r — refresh list',
      'Enter — view message',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, title]);

  const applyQuery = useCallback(() => {
    setAppliedQuery(queryDraft.trim());
    setIsEditingQuery(false);
  }, [queryDraft]);

  const applyFrom = useCallback(() => {
    setAppliedFrom(fromDraft.trim());
    setIsEditingFrom(false);
  }, [fromDraft]);

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailMessage(null);
  }, [detail, actions]);

  const handleSelectMessage = useCallback(async (id: string) => {
    const summary = currentMessages.find((m) => m.id === id);
    actions.resetStatus();
    setDetailMessage(null);

    await detail.open({
      title: summary?.subject || 'Message',
      load: async () => {
        if (!gmailDeps.getMessage) {
          throw new Error('getMessage dependency function is not provided.');
        }
        const message = await gmailDeps.getMessage(id);
        setDetailMessage(message);
        return textToDetailLines(formatGmailMessageDetail(message, 'human'));
      },
    });
  }, [actions, currentMessages, detail, gmailDeps]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailMessage) return [];

    const attachmentCount = detailMessage.attachments.length;
    const attachmentActions: TuiDetailAction[] = [];

    if (attachmentCount === 1) {
      const attachment = detailMessage.attachments[0]!;
      attachmentActions.push({
        key: 'd',
        label: 'download attachment',
        onAction: () => actions.runAction(async () => {
          const download = await gmailAttachmentDeps.downloadAttachment(
            detailMessage.id,
            attachment.attachmentId,
            attachment.filename,
          );
          if (!download.saved) {
            throw new Error(`Failed to save ${attachment.filename}`);
          }
          return `Saved ${attachment.filename} (${download.size} bytes)`;
        }),
      });
    } else if (attachmentCount > 1) {
      attachmentActions.push({
        key: 'd',
        label: 'download first attachment',
        onAction: () => actions.runAction(async () => {
          const attachment = detailMessage.attachments[0]!;
          const download = await gmailAttachmentDeps.downloadAttachment(
            detailMessage.id,
            attachment.attachmentId,
            attachment.filename,
          );
          if (!download.saved) {
            throw new Error(`Failed to save ${attachment.filename}`);
          }
          return `Saved ${attachment.filename} (${download.size} bytes)`;
        }),
      });
      attachmentActions.push({
        key: 'a',
        label: 'download all attachments',
        onAction: () => actions.runAction(async () => {
          const download = await gmailAttachmentDeps.downloadAllAttachments(detailMessage.id);
          if (download.downloaded === 0) {
            throw new Error('No attachments were saved');
          }
          return `Saved ${download.downloaded} attachment(s)${download.failed > 0 ? `, ${download.failed} failed` : ''}`;
        }),
      });
    }

    return mergeDetailActions(actions.runAction, {
      resourceId: detailMessage.id,
      openUrl: gmailMessageUrl(detailMessage.id),
      actions: attachmentActions,
    });
  }, [actions, detailMessage, gmailAttachmentDeps]);

  const editing = isEditingQuery || isEditingFrom;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
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
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Message'}
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
    </>
  );

  return (
    <TuiListScreen
      title={title}
      pageLabel={`Page ${currentIndex + 1}`}
      items={currentMessages}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectMessage}
      formatLabel={formatMessageLabel}
      getId={(message) => message.id}
      filterSlot={filterSlot}
      emptyMessage="No messages found for this query on this page."
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}