import React, { useEffect, useState } from 'react';
import { useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from './TuiNavigationContext.js';
import { TuiScreenShell } from './TuiScreenShell.js';
import { TuiKeybar } from './TuiKeybar.js';
import { WorkspaceReportTui } from '../workspace/WorkspaceReportTui.js';
import { WorkspaceUserTui } from '../workspace/WorkspaceUserTui.js';
import { WorkspaceDeviceTui } from '../workspace/WorkspaceDeviceTui.js';
import { WorkspaceGroupTui } from '../workspace/WorkspaceGroupTui.js';
import { WorkspaceOrgTui } from '../workspace/WorkspaceOrgTui.js';
// Router for Workspace Admin TUI components. Depend on TuiConfigDeps.
import type { TuiConfigDeps } from './MasterLayout.js';

interface WorkspaceRouterProps {
  deps: TuiConfigDeps;
  onCancel: () => void;
}

export function WorkspaceRouter({ deps, onCancel }: WorkspaceRouterProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  useEffect(() => {
    if (activeSubMenu === null) {
      setBreadcrumbs(['Workspace']);
      setHelpLines(['↑/↓ select · Enter open · ? help · ESC back']);
    }
  }, [activeSubMenu, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'Reports', value: 'reports' },
    { label: 'User Management', value: 'users' },
    { label: 'Device Management', value: 'devices' },
    { label: 'Group Management', value: 'groups' },
    { label: 'Org Unit Management', value: 'orgs' }
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'reports') {
    return (
      <WorkspaceReportTui
        reportDeps={deps.reportDeps}
        userDeps={deps.userDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'users') {
    return (
      <WorkspaceUserTui
        userDeps={deps.userDeps}
        reportDeps={deps.reportDeps}
        groupDeps={deps.groupDeps}
        deviceDeps={deps.deviceDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'devices') {
    return (
      <WorkspaceDeviceTui
        deviceDeps={deps.deviceDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'groups') {
    return (
      <WorkspaceGroupTui
        groupDeps={deps.groupDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'orgs') {
    return (
      <WorkspaceOrgTui
        orgDeps={deps.orgDeps}
        userDeps={deps.userDeps}
        groupDeps={deps.groupDeps}
        deviceDeps={deps.deviceDeps}
        reportDeps={deps.reportDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <TuiScreenShell title="Workspace Admin">
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}
