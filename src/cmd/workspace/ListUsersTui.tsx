import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { normalizeOrgUnitPath } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { UserHubTui } from './UserHubTui.js';
import type {
  WorkspaceUserCommandDeps,
  WorkspaceUser,
  WorkspaceGroupCommandDeps,
  WorkspaceDeviceCommandDeps,
  WorkspaceReportCommandDeps,
} from './commands.js';
import { getLastOrgUnitPath, setLastOrgUnitPath } from './workspaceSessionState.js';

export interface ListUsersTuiProps {
  userDeps: WorkspaceUserCommandDeps;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
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
  groupDeps,
  deviceDeps,
  reportDeps,
  defaultOrgUnitPath = getLastOrgUnitPath(),
  onCancel,
}: ListUsersTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [orgUnitDraft, setOrgUnitDraft] = useState(defaultOrgUnitPath);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedOrgPath, setAppliedOrgPath] = useState(normalizeOrgUnitPath(defaultOrgUnitPath));
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeField, setActiveField] = useState<'org' | 'search' | null>(null);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) => {
      if (!userDeps.listUsers) {
        throw new Error('listUsers dependency function is not provided.');
      }
      return userDeps.listUsers(appliedOrgPath, {
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(appliedSearch ? { query: appliedSearch } : {}),
        ...(pageToken !== undefined ? { pageToken } : {}),
      });
    },
    [appliedOrgPath, appliedSearch, userDeps],
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
    queryKey: `${appliedOrgPath}:${appliedSearch}`,
  });

  useEffect(() => {
    if (selectedUser) return;
    setBreadcrumbs(['Workspace', 'Users']);
    setHelpLines([
      'f or / — edit org unit',
      's — search users (domain-wide)',
      'r — refresh list',
      'Enter — open user hub',
      'Tab — switch field while editing',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [selectedUser, setBreadcrumbs, setHelpLines]);

  const applyFilters = useCallback(() => {
    const normalized = normalizeOrgUnitPath(orgUnitDraft);
    setLastOrgUnitPath(normalized);
    setAppliedOrgPath(normalized);
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setActiveField(null);
  }, [orgUnitDraft, searchDraft, setCurrentIndex]);

  const handleSelectUser = useCallback(async (userId: string) => {
    const user = rawUsers.find((u) => u.id === userId);
    if (!user?.primaryEmail) return;
    setSelectedUser(user);
  }, [rawUsers]);

  const editing = activeField !== null;
  const blocked = editing;

  useInput((input, key) => {
    if (selectedUser !== null) return;

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

  if (selectedUser) {
    return (
      <UserHubTui
        user={selectedUser}
        userDeps={userDeps as Required<WorkspaceUserCommandDeps>}
        groupDeps={groupDeps}
        deviceDeps={deviceDeps}
        reportDeps={reportDeps}
        breadcrumbRoot={['Workspace', 'Users']}
        onCancel={() => setSelectedUser(null)}
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
        hint="f or / = org unit · s = search · Enter applies · Tab switches field · ESC cancels edit · searches whole domain"
      />
    </Box>
  );

  const emptyMessage = appliedSearch
    ? `No users match "${appliedSearch}" in ${appliedOrgPath}.`
    : `No users found for ${appliedOrgPath}.`;

  return (
    <TuiListScreen
      title={`Users in org ${appliedOrgPath}`}
      pageLabel={`Page ${currentIndex + 1}`}
      items={rawUsers}
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
