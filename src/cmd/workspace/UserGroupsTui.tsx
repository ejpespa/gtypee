import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { adminGroupUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceGroupCommandDeps, GroupInfo } from './commands.js';

export interface UserGroupsTuiProps {
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  userEmail: string;
  onCancel?: () => void;
}

function formatGroupLabel(group: GroupInfo): string {
  return `${group.name} <${group.email}>`;
}

function groupId(group: GroupInfo): string {
  return group.id || group.email;
}

export function UserGroupsTui({ groupDeps, userEmail, onCancel }: UserGroupsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      return groupDeps.listGroupsForUser(userEmail, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [groupDeps, userEmail],
  );

  const {
    items: groups,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: `user-groups:${userEmail}`,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Users', userEmail, 'Groups']);
    setHelpLines([
      'r — refresh list',
      'Enter — view group',
      'o/c — open Admin / copy email in detail',
      '←/→ or Space — paginate',
      'ESC — back to user hub',
    ]);
  }, [setBreadcrumbs, setHelpLines, userEmail]);

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedGroup(null);
  }, [actions, detail]);

  const handleSelectGroup = useCallback(async (id: string) => {
    const group = groups.find((g) => groupId(g) === id);
    if (!group) return;

    actions.resetStatus();
    setSelectedGroup(group);

    await detail.open({
      title: group.email,
      load: async () => [
        `Name: ${group.name}`,
        `Email: ${group.email}`,
        `ID: ${group.id}`,
      ],
    });
  }, [actions, detail, groups]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedGroup) return [];

    return [
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
  }, [actions, selectedGroup]);

  useInput((_input, key) => {
    if (detail.isOpen) return;

    if (key.escape) {
      onCancel?.();
    }
  });

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

  return (
    <TuiListScreen
      title={`Groups · ${userEmail}`}
      pageLabel={`Page ${currentIndex + 1}`}
      items={groups}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectGroup}
      formatLabel={formatGroupLabel}
      getId={groupId}
      emptyMessage={`No groups for ${userEmail}.`}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      onRefresh={refresh}
      blocked={detail.isOpen}
    />
  );
}
