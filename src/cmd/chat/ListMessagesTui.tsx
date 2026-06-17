import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
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
  const [spaceDraft, setSpaceDraft] = useState('');
  const [appliedSpace, setAppliedSpace] = useState('');
  const [isEditingSpace, setIsEditingSpace] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const applySpace = useCallback(() => {
    const trimmed = spaceDraft.trim();
    setAppliedSpace(trimmed);
    setCurrentIndex(0);
    setIsEditingSpace(false);
  }, [spaceDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    if (!appliedSpace) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    void chatDeps.ensureWorkspace()
      .then(() => chatDeps.listMessages(appliedSpace))
      .then((items) => {
        if (!active) return;
        setMessages(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        setLoading(false);
      });

    return () => { active = false; };
  }, [chatDeps, appliedSpace]);

  const filteredMessages = filterItemsByQuery(
    messages,
    appliedSearch,
    (message) => [message.text, message.id],
  );

  const { slice: visibleMessages, hasNextPage } = sliceLocalPage(
    filteredMessages,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  useInput((input, key) => {
    if (isEditingSpace || isEditingSearch) {
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

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (input === 'p') {
      setIsEditingSpace(true);
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

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Chat Messages (Page {currentIndex + 1})</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Space: </Text>
        {isEditingSpace ? (
          <TextInput value={spaceDraft} onChange={setSpaceDraft} onSubmit={applySpace} />
        ) : (
          <Text>
            {appliedSpace || '(not set)'}
            <Text color="gray"> (press p to set)</Text>
          </Text>
        )}
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

      {!appliedSpace ? (
        <Text color="gray">Enter a space id (e.g. spaces/ABC123) and press Enter.</Text>
      ) : loading ? (
        <Text color="yellow">Loading messages...</Text>
      ) : messages.length === 0 ? (
        <Text color="gray">No messages found in this space.</Text>
      ) : visibleMessages.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No messages match "${appliedSearch}".`
            : 'No messages found.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleMessages.map((message) => ({
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
          hasNextPage={hasNextPage}
          loading={loading}
          backHint="ESC to return"
        />
      </Box>
    </Box>
  );
}