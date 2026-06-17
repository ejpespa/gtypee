import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
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
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

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
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}
