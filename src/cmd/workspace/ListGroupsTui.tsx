import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { adminGroupUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { GroupActionsTui } from './GroupActionsTui.js';
import type { WorkspaceGroupCommandDeps, GroupInfo } from './commands.js';

export interface ListGroupsTuiProps {
  groupDeps: WorkspaceGroupCommandDeps;
  onViewMembers?: (groupEmail: string) => void;
  onCancel?: () => void;
}

function formatGroupLabel(group: GroupInfo): string {
  return `${group.name} <${group.email}>`;
}

function groupDescription(group: GroupInfo): string | undefined {
  return (group as GroupInfo & { description?: string }).description;
}

export function ListGroupsTui({ groupDeps, onViewMembers, onCancel }: ListGroupsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [actionsGroupEmail, setActionsGroupEmail] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!groupDeps.listGroups) {
        throw new Error('listGroups dependency function is not provided.');
      }
      return groupDeps.listGroups({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [groupDeps],
  );

  const {
    items: currentGroups,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'workspace-groups',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Groups']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view group',
      'o/c/m/a — actions in detail',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleGroups = filterItemsByQuery(
    currentGroups,
    appliedSearch,
    (g) => [g.email, g.name],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedGroup(null);
  }, [actions, detail]);

  const openGroupActions = useCallback((groupEmail: string) => {
    clearDetail();
    setActionsGroupEmail(groupEmail);
  }, [clearDetail]);

  const handleSelectGroup = useCallback(async (groupId: string) => {
    const group = visibleGroups.find((g) => g.id === groupId);
    if (!group) return;

    actions.resetStatus();
    setSelectedGroup(group);

    await detail.open({
      title: group.email,
      load: async () => {
        let description = groupDescription(group);

        if (!description && groupDeps.getGroup) {
          const full = await groupDeps.getGroup(group.email).catch(() => null);
          description = full ? groupDescription(full) : undefined;
        }

        return [
          `Name: ${group.name}`,
          `Email: ${group.email}`,
          `ID: ${group.id}`,
          `Description: ${description?.trim() || '(none)'}`,
        ];
      },
    });
  }, [actions, detail, groupDeps, visibleGroups]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedGroup) return [];

    const panelActions: TuiDetailAction[] = [
      {
        key: 'o',
        label: 'open in Admin',
        onAction: () => actions.runAction(async () => {
          await openInBrowser(adminGroupUrl(selectedGroup.email));
          return 'Opened in Admin Console';
        }),
      },
      {
        key: 'c',
        label: 'copy email',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(selectedGroup.email);
          return `Copied email: ${selectedGroup.email}`;
        }),
      },
    ];

    if (onViewMembers) {
      panelActions.push({
        key: 'm',
        label: 'view members',
        onAction: () => actions.runAction(async () => {
          onViewMembers(selectedGroup.email);
          clearDetail();
          return `Opening members for ${selectedGroup.email}`;
        }),
      });
    }

    panelActions.push({
      key: 'a',
      label: 'group actions',
      onAction: () => actions.runAction(async () => {
        openGroupActions(selectedGroup.email);
        return `Opening actions for ${selectedGroup.email}`;
      }),
    });

    return panelActions;
  }, [actions, clearDetail, onViewMembers, openGroupActions, selectedGroup]);

  const blocked = isEditingSearch || detail.isOpen || actionsGroupEmail !== null;

  useInput((input, key) => {
    if (actionsGroupEmail !== null || detail.isOpen) return;

    if (isEditingSearch) {
      if (key.escape) {
        setSearchDraft(appliedSearch);
        setIsEditingSearch(false);
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (actionsGroupEmail !== null) {
    const actionsProps = {
      groupDeps: groupDeps as Required<WorkspaceGroupCommandDeps>,
      prefillGroupEmail: actionsGroupEmail,
      onCancel: () => setActionsGroupEmail(null),
      ...(onViewMembers ? { onViewMembers } : {}),
    };

    return <GroupActionsTui {...actionsProps} />;
  }

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Group'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailPanelActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

  const emptyMessage = visibleGroups.length === 0 && currentGroups.length > 0 && appliedSearch
    ? `No groups match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No groups found on this page.';

  return (
    <TuiListScreen
      title="Workspace Admin: Groups"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleGroups}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectGroup}
      formatLabel={formatGroupLabel}
      getId={(group) => group.id}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
        />
      )}
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