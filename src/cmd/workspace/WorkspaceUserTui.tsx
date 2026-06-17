import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { CreateUserWizard } from './CreateUserWizard.js';
import { DeletedUsersTui } from './DeletedUsersTui.js';
import { InactiveUsersTui } from './InactiveUsersTui.js';
import { ListUsersTui } from './ListUsersTui.js';
import { UserActionsTui } from './UserActionsTui.js';
import type { WorkspaceReportCommandDeps, WorkspaceUserCommandDeps } from './commands.js';

export interface WorkspaceUserTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  reportDeps?: Required<WorkspaceReportCommandDeps>;
  onCancel?: () => void;
}

export function WorkspaceUserTui({ userDeps, reportDeps, onCancel }: WorkspaceUserTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Users']);
      setHelpLines(['↑/↓ select · Enter open · ? help · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'List Users by Org Unit', value: 'list-users' },
    { label: 'Inactive Users', value: 'inactive-users' },
    { label: 'Create User Wizard', value: 'create-user' },
    { label: 'User Actions', value: 'user-actions' },
    { label: 'Recover Deleted User →', value: 'recover-deleted-user' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      onCancel?.();
      return;
    }
    if (activeView !== null && key.escape) {
      setActiveView(null);
    }
  });

  if (activeView === 'create-user') {
    return (
      <CreateUserWizard
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-users') {
    return (
      <ListUsersTui
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'inactive-users') {
    return (
      <InactiveUsersTui
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'user-actions') {
    return (
      <UserActionsTui
        userDeps={userDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'recover-deleted-user') {
    if (!reportDeps) {
      return (
        <Box flexDirection="column" flexGrow={1}>
          <Text color="red">Deleted user recovery requires report dependencies.</Text>
          <Text color="gray">Use Workspace Admin → Reports → Deleted Users.</Text>
        </Box>
      );
    }

    return (
      <DeletedUsersTui
        reportDeps={reportDeps}
        userDeps={userDeps}
        days={20}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <TuiScreenShell title="User Management">
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}