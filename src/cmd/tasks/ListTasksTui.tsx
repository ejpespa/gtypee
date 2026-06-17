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
import type { TasksCommandDeps, TaskItem } from './commands.js';

export interface ListTasksTuiProps {
  tasksDeps: Required<TasksCommandDeps>;
  onCancel?: () => void;
}

function formatTaskLabel(task: TaskItem): string {
  const status = task.done ? '[done]' : '[open]';
  return `${status} ${task.title}`;
}

function formatTaskDetailLines(task: TaskItem, listId: string | undefined): string[] {
  return textToDetailLines([
    `ID: ${task.id}`,
    `Title: ${task.title}`,
    `Done: ${task.done ? 'yes' : 'no'}`,
    `Status: ${task.done ? 'completed' : 'open'}`,
    `List: ${listId ?? '@default'}`,
  ].join('\n'));
}

export function ListTasksTui({ tasksDeps, onCancel }: ListTasksTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [listIdDraft, setListIdDraft] = useState('');
  const [appliedListId, setAppliedListId] = useState<string | undefined>(undefined);
  const [isEditingListId, setIsEditingListId] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);

  const fetchAll = useCallback(
    () => tasksDeps.listTasks(appliedListId),
    [tasksDeps, appliedListId],
  );

  const {
    allItems,
    currentIndex,
    setCurrentIndex,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: appliedListId ?? '@default',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Tasks', 'Tasks']);
    setHelpLines([
      'l — edit task list id',
      '/ or s — filter tasks',
      'r — refresh list',
      'Enter — view task',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applyListId = useCallback(() => {
    const trimmed = listIdDraft.trim();
    setAppliedListId(trimmed || undefined);
    setIsEditingListId(false);
  }, [listIdDraft]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft, setCurrentIndex]);

  const filteredTasks = filterItemsByQuery(
    allItems,
    appliedSearch,
    (task) => [task.title, task.id],
  );

  const { slice: visibleTasks, hasNextPage } = sliceLocalPage(
    filteredTasks,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailTask(null);
  }, [detail, actions]);

  const handleSelectTask = useCallback(async (id: string) => {
    const task = filteredTasks.find((t) => t.id === id);
    if (!task) return;

    actions.resetStatus();
    setDetailTask(task);

    await detail.open({
      title: task.title || 'Task',
      load: async () => formatTaskDetailLines(task, appliedListId),
    });
  }, [actions, appliedListId, detail, filteredTasks]);

  const detailActions = useMemo(() => {
    if (!detailTask) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailTask.id,
    });
  }, [actions.runAction, detailTask]);

  const editing = isEditingListId || isEditingSearch;
  const blocked = editing || detail.isOpen;
  const listLabel = appliedListId ?? '@default';

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (editing) {
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

    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (input === 'l') {
      setIsEditingListId(true);
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Task'}
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
        <Text color={isEditingListId ? 'cyan' : 'gray'}>List: </Text>
        {isEditingListId ? (
          <TextInput value={listIdDraft} onChange={setListIdDraft} onSubmit={applyListId} />
        ) : (
          <>
            <Text color="green">{listLabel}</Text>
            <Text color="gray"> · l to edit · Enter to apply</Text>
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

  const emptyMessage = visibleTasks.length === 0 && filteredTasks.length > 0 && appliedSearch
    ? `No tasks match "${appliedSearch}". Clear search or change list.`
    : 'No tasks found.';

  return (
    <TuiListScreen
      title="Tasks"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleTasks}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectTask}
      formatLabel={formatTaskLabel}
      getId={(task) => task.id}
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