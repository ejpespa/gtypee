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
import type { TasksCommandDeps, TaskItem } from './commands.js';

export interface ListTasksTuiProps {
  tasksDeps: Required<TasksCommandDeps>;
  onCancel?: () => void;
}

function formatTaskLabel(task: TaskItem): string {
  const status = task.done ? '[done]' : '[open]';
  return `${status} ${task.title}`;
}

export function ListTasksTui({ tasksDeps, onCancel }: ListTasksTuiProps) {
  const [listIdDraft, setListIdDraft] = useState('');
  const [appliedListId, setAppliedListId] = useState<string | undefined>(undefined);
  const [isEditingListId, setIsEditingListId] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const applyListId = useCallback(() => {
    const trimmed = listIdDraft.trim();
    setAppliedListId(trimmed || undefined);
    setIsEditingListId(false);
  }, [listIdDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    tasksDeps.listTasks(appliedListId)
      .then((items) => {
        if (!active) return;
        setTasks(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        setLoading(false);
      });

    return () => { active = false; };
  }, [tasksDeps, appliedListId]);

  const filteredTasks = filterItemsByQuery(
    tasks,
    appliedSearch,
    (task) => [task.title, task.id],
  );

  const { slice: visibleTasks, hasNextPage } = sliceLocalPage(
    filteredTasks,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  useInput((input, key) => {
    if (isEditingListId || isEditingSearch) {
      if (key.escape) {
        if (isEditingListId) {
          setListIdDraft(appliedListId ?? '');
          setIsEditingListId(false);
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

    if (input === 'l') {
      setIsEditingListId(true);
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

  const listLabel = appliedListId ?? '@default';

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Tasks (Page {currentIndex + 1})</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">List: </Text>
        {isEditingListId ? (
          <TextInput value={listIdDraft} onChange={setListIdDraft} onSubmit={applyListId} />
        ) : (
          <Text>
            {listLabel}
            <Text color="gray"> (press l to change)</Text>
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

      {loading ? (
        <Text color="yellow">Loading tasks...</Text>
      ) : tasks.length === 0 ? (
        <Text color="gray">No tasks found.</Text>
      ) : visibleTasks.length === 0 ? (
        <Text color="gray">
          {appliedSearch
            ? `No tasks match "${appliedSearch}". Clear search or change list.`
            : 'No tasks found.'}
        </Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <SelectInput
            items={visibleTasks.map((task) => ({
              label: formatTaskLabel(task),
              value: task.id,
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