import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE, sliceLocalPage } from '../tui/pagination.js';
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
import type { ChatCommandDeps, ChatMessage } from './commands.js';

export interface ListMessagesTuiProps {
  chatDeps: Required<ChatCommandDeps>;
  onCancel?: () => void;
}

function truncateText(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 3)}...`;
}

function formatMessageLabel(message: ChatMessage): string {
  return truncateText(message.text || message.id);
}

export function ListMessagesTui({ chatDeps, onCancel }: ListMessagesTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [spaceDraft, setSpaceDraft] = useState('');
  const [appliedSpace, setAppliedSpace] = useState('');
  const [isEditingSpace, setIsEditingSpace] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailMessage, setDetailMessage] = useState<ChatMessage | null>(null);

  const fetchAll = useCallback(async () => {
    await chatDeps.ensureWorkspace();
    return chatDeps.listMessages(appliedSpace);
  }, [chatDeps, appliedSpace]);

  const {
    allItems,
    currentIndex,
    setCurrentIndex,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: appliedSpace,
    enabled: !!appliedSpace,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Chat', 'Messages']);
    setHelpLines([
      'p — set space id',
      '/ or s — filter messages',
      'r — refresh list',
      'Enter — view message',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySpace = useCallback(() => {
    const trimmed = spaceDraft.trim();
    setAppliedSpace(trimmed);
    setIsEditingSpace(false);
  }, [spaceDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft, setCurrentIndex]);

  const filteredMessages = filterItemsByQuery(
    allItems,
    appliedSearch,
    (message) => [message.text, message.id],
  );

  const { slice: visibleMessages, hasNextPage } = sliceLocalPage(
    filteredMessages,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailMessage(null);
  }, [detail, actions]);

  const handleSelectMessage = useCallback(async (id: string) => {
    const message = filteredMessages.find((m) => m.id === id);
    if (!message) return;

    actions.resetStatus();
    setDetailMessage(message);

    await detail.open({
      title: truncateText(message.text || message.id, 40),
      load: async () => textToDetailLines([
        `ID: ${message.id}`,
        `Space: ${appliedSpace}`,
        `Text: ${message.text || '(empty message)'}`,
        '',
        message.text || '(empty message)',
      ].join('\n')),
    });
  }, [actions, appliedSpace, detail, filteredMessages]);

  const detailActions = useMemo(() => {
    if (!detailMessage) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailMessage.id,
    });
  }, [actions.runAction, detailMessage]);

  const editing = isEditingSpace || isEditingSearch;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
      if (key.escape) {
        if (isEditingSpace) {
          setSpaceDraft(appliedSpace);
          setIsEditingSpace(false);
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

    if (input === 'p') {
      setIsEditingSpace(true);
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
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
        <Text color={isEditingSpace ? 'cyan' : 'gray'}>Space: </Text>
        {isEditingSpace ? (
          <TextInput value={spaceDraft} onChange={setSpaceDraft} onSubmit={applySpace} />
        ) : (
          <>
            <Text color="green">{appliedSpace || '(not set)'}</Text>
            <Text color="gray"> · p to set · Enter to apply</Text>
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

  const emptyMessage = !appliedSpace
    ? 'Enter a space id (e.g. spaces/ABC123) and press Enter.'
    : visibleMessages.length === 0 && filteredMessages.length > 0 && appliedSearch
      ? `No messages match "${appliedSearch}".`
      : 'No messages found in this space.';

  return (
    <TuiListScreen
      title="Chat Messages"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleMessages}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectMessage}
      formatLabel={formatMessageLabel}
      getId={(message) => message.id}
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