import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { adminUserUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { UserActionsTui } from './UserActionsTui.js';
import type { WorkspaceUserCommandDeps, WorkspaceUser } from './commands.js';

export interface InactiveUsersTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  days?: number;
  onCancel?: () => void;
}

function formatUserLabel(user: WorkspaceUser): string {
  const adminTag = user.isAdmin ? ' [ADMIN]' : '';
  const susTag = user.suspended ? ' [SUSPENDED]' : '';
  const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ');
  const namePart = fullName ? ` — ${fullName}` : '';
  return `${user.primaryEmail}${adminTag}${susTag}${namePart}`;
}

export function InactiveUsersTui({ userDeps, days = 365, onCancel }: InactiveUsersTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [neverOnly, setNeverOnly] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  const [actionsEmail, setActionsEmail] = useState<string | null>(null);

  const detail = useDetailView();
  const actions = useDetailActions();

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Users', 'Inactive']);
    setHelpLines([
      'n — toggle never signed in only',
      '/ or s — search',
      'Enter — view user',
      'a — user actions (in detail)',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    userDeps.listInactiveUsers(days, neverOnly)
      .then((items) => {
        if (!active) return;
        setUsers(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve inactive users');
        setLoading(false);
      });

    return () => { active = false; };
  }, [userDeps, days, neverOnly]);

  const filteredUsers = filterItemsByQuery(
    users,
    appliedSearch,
    (user) => [
      user.primaryEmail,
      user.name.givenName,
      user.name.familyName,
      user.orgUnitPath,
    ],
  );

  const { slice: visibleUsers, hasNextPage } = sliceLocalPage(
    filteredUsers,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / DEFAULT_TUI_PAGE_SIZE));

  const headerLabel = neverOnly
    ? 'Users who have never signed in'
    : `Inactive users (no login in ${days} days)`;

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedUser(null);
  }, [actions, detail]);

  const openUserActions = useCallback((email: string) => {
    clearDetail();
    setActionsEmail(email);
  }, [clearDetail]);

  const handleSelectUser = useCallback(async (userId: string) => {
    const user = filteredUsers.find((u) => u.id === userId);
    if (!user) return;

    actions.resetStatus();
    setSelectedUser(user);

    await detail.open({
      title: user.primaryEmail,
      load: async () => {
        const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ') || '(none)';
        const aliases = userDeps.listAliases
          ? await userDeps.listAliases(user.primaryEmail).catch(() => [])
          : [];
        const aliasLine = aliases.length > 0 ? aliases.join(', ') : '(none)';

        return [
          `Email: ${user.primaryEmail}`,
          `Name: ${fullName}`,
          `Org unit: ${user.orgUnitPath}`,
          `Admin: ${user.isAdmin ? 'yes' : 'no'}`,
          `Suspended: ${user.suspended ? 'yes' : 'no'}`,
          `Last login: ${user.lastLoginTime ?? 'unknown'}`,
          `User ID: ${user.id}`,
          `Aliases: ${aliasLine}`,
        ];
      },
    });
  }, [actions, detail, filteredUsers, userDeps]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedUser) return [];

    const userKey = selectedUser.id || selectedUser.primaryEmail;

    return [
      {
        key: 'o',
        label: 'open in Admin',
        onAction: () => actions.runAction(async () => {
          await openInBrowser(adminUserUrl(userKey));
          return 'Opened in Admin Console';
        }),
      },
      {
        key: 'c',
        label: 'copy email',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(selectedUser.primaryEmail);
          return `Copied email: ${selectedUser.primaryEmail}`;
        }),
      },
      {
        key: 'a',
        label: 'user actions',
        onAction: () => actions.runAction(async () => {
          openUserActions(selectedUser.primaryEmail);
          return `Opening actions for ${selectedUser.primaryEmail}`;
        }),
      },
    ];
  }, [actions, openUserActions, selectedUser]);

  const blocked = isEditingSearch || detail.isOpen || actionsEmail !== null;

  useInput((input, key) => {
    if (actionsEmail !== null || detail.isOpen) return;

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

    if (input === 'n') {
      setNeverOnly((prev) => !prev);
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (actionsEmail !== null) {
    return (
      <UserActionsTui
        userDeps={userDeps}
        prefillEmail={actionsEmail}
        onCancel={() => setActionsEmail(null)}
      />
    );
  }

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'User'}
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

  const filterSlot = (
    <Box flexDirection="column" flexShrink={0} marginBottom={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text color="gray">
          Filter:{' '}
          <Text color={neverOnly ? 'yellow' : 'green'}>
            {neverOnly ? 'never signed in only' : `inactive ≥ ${days} days`}
          </Text>
          {' · press '}
          <Text color="cyan">n</Text>
          {' to toggle'}
        </Text>
      </Box>
      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={isEditingSearch}
        onDraftChange={setSearchDraft}
        onSubmit={applySearch}
        hint="press / or s to edit · Enter to apply · ESC to cancel · filters all results"
      />
    </Box>
  );

  const emptyMessage = users.length === 0
    ? (neverOnly
      ? 'No users found who have never signed in.'
      : `No inactive users found (threshold: ${days} days).`)
    : appliedSearch
      ? `No users match "${appliedSearch}". Clear search to see all results.`
      : 'No inactive users found.';

  return (
    <TuiListScreen
      title={headerLabel}
      pageLabel={`Page ${currentIndex + 1}/${totalPages}`}
      items={visibleUsers}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectUser}
      formatLabel={formatUserLabel}
      getId={(user) => user.id}
      filterSlot={filterSlot}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      blocked={blocked}
    />
  );
}