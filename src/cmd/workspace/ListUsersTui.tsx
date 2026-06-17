import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterWorkspaceUsersByQuery, normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { adminUserUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { UserActionsTui } from './UserActionsTui.js';
import type { WorkspaceUserCommandDeps, WorkspaceUser } from './commands.js';

export interface ListUsersTuiProps {
  userDeps: WorkspaceUserCommandDeps;
  defaultOrgUnitPath?: string;
  onCancel?: () => void;
}

function formatUserLabel(user: WorkspaceUser): string {
  const adminTag = user.isAdmin ? ' [ADMIN]' : '';
  const susTag = user.suspended ? ' [SUSPENDED]' : '';
  const fullName = [user.name.givenName, user.name.familyName].filter(Boolean).join(' ');
  const namePart = fullName ? ` — ${fullName}` : '';
  return `${user.primaryEmail}${adminTag}${susTag}${namePart}`;
}

export function ListUsersTui({
  userDeps,
  defaultOrgUnitPath = '/Test',
  onCancel,
}: ListUsersTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [orgUnitDraft, setOrgUnitDraft] = useState(defaultOrgUnitPath);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState(normalizeOrgUnitPath(defaultOrgUnitPath));
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);
  const [actionsEmail, setActionsEmail] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!userDeps.listUsers) {
        throw new Error('listUsers dependency function is not provided.');
      }
      return userDeps.listUsers(appliedOrgPath, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [appliedOrgPath, userDeps],
  );

  const {
    items: rawUsers,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: appliedOrgPath,
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Users']);
    setHelpLines([
      'f or / — edit org unit',
      's — search current page',
      'r — refresh list',
      'Enter — view user',
      'Tab — switch field while editing',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applyFilters = useCallback(() => {
    setAppliedOrgPath(normalizeOrgUnitPath(orgUnitDraft));
    setAppliedSearch(searchDraft.trim());
    setActiveField(null);
  }, [orgUnitDraft, searchDraft]);

  const visibleUsers = filterWorkspaceUsersByQuery(rawUsers, appliedSearch);

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
    const user = visibleUsers.find((u) => u.id === userId);
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
  }, [actions, detail, userDeps, visibleUsers]);

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

  const editing = activeField !== null;
  const blocked = editing || detail.isOpen;

  useInput((input, key) => {
    if (actionsEmail !== null || detail.isOpen) return;

    if (activeField !== null) {
      if (key.escape) {
        setActiveField(null);
        return;
      }
      if (key.tab) {
        setActiveField(activeField === 'org' ? 'search' : 'org');
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === 'f' || input === '/') {
      setActiveField('org');
      return;
    }

    if (input === 's') {
      setActiveField('search');
    }
  });

  if (actionsEmail !== null) {
    return (
      <UserActionsTui
        userDeps={userDeps as Required<WorkspaceUserCommandDeps>}
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
      <Box>
        <Text color={activeField === 'org' ? 'cyan' : 'gray'}>Org unit: </Text>
        {activeField === 'org' ? (
          <TextInput
            value={orgUnitDraft}
            onChange={setOrgUnitDraft}
            onSubmit={applyFilters}
          />
        ) : (
          <Text color="green">{orgUnitDraft || '/'}</Text>
        )}
      </Box>
      <TuiSearchControls
        appliedSearch={appliedSearch}
        searchDraft={searchDraft}
        isEditing={activeField === 'search'}
        onDraftChange={setSearchDraft}
        onSubmit={applyFilters}
        hint="f or / = org unit · s = search · Enter applies · Tab switches field · ESC cancels edit · filters current page"
      />
    </Box>
  );

  const emptyMessage = visibleUsers.length === 0 && rawUsers.length > 0 && appliedSearch
    ? `No users match "${appliedSearch}" on this page. Try Next → or clear search.`
    : `No users found for ${appliedOrgPath} on this page.`;

  return (
    <TuiListScreen
      title={`Users in org ${appliedOrgPath}`}
      pageLabel={`Page ${currentIndex + 1}`}
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
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}