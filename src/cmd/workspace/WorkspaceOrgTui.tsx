import React, { useEffect, useState } from 'react';
import { useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { CreateOrgWizard } from './CreateOrgWizard.js';
import { ListOrgsTui } from './ListOrgsTui.js';
import { ListUsersTui } from './ListUsersTui.js';
import { setLastOrgUnitPath } from './workspaceSessionState.js';
import type {
  WorkspaceOrgUnitCommandDeps,
  WorkspaceUserCommandDeps,
  WorkspaceGroupCommandDeps,
  WorkspaceDeviceCommandDeps,
  WorkspaceReportCommandDeps,
} from './commands.js';

export interface WorkspaceOrgTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  userDeps: WorkspaceUserCommandDeps;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  onCancel?: () => void;
}

export function WorkspaceOrgTui({
  orgDeps,
  userDeps,
  groupDeps,
  deviceDeps,
  reportDeps,
  onCancel,
}: WorkspaceOrgTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [prefillOrgUnitPathForUsers, setPrefillOrgUnitPathForUsers] = useState<string | undefined>(undefined);

  const handleViewUsersInOrg = (orgUnitPath: string) => {
    setLastOrgUnitPath(orgUnitPath);
    setPrefillOrgUnitPathForUsers(orgUnitPath);
    setActiveView('list-users');
  };

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Orgs']);
      setHelpLines(['↑/↓ select · Enter open · ? help · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'List Org Units', value: 'list-orgs' },
    { label: 'Create Org Unit', value: 'create-org' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveView(item.value);
  };

  // Only handle ESC on the menu itself. Child views own ESC via onCancel
  // (list-users → list-orgs, hub → list, etc.). Parent must not steal the stack.
  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      onCancel?.();
    }
  });

  if (activeView === 'create-org') {
    return (
      <CreateOrgWizard
        orgDeps={orgDeps}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-orgs') {
    return (
      <ListOrgsTui
        orgDeps={orgDeps}
        onViewUsersInOrg={handleViewUsersInOrg}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'list-users') {
    return (
      <ListUsersTui
        userDeps={userDeps}
        groupDeps={groupDeps}
        deviceDeps={deviceDeps}
        reportDeps={reportDeps}
        {...(prefillOrgUnitPathForUsers ? { defaultOrgUnitPath: prefillOrgUnitPathForUsers } : {})}
        onCancel={() => {
          setPrefillOrgUnitPathForUsers(undefined);
          setActiveView('list-orgs');
        }}
      />
    );
  }

  return (
    <TuiScreenShell title="Org Unit Management">
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}
