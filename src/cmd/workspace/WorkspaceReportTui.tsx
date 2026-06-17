import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { AdminAuditTui } from './AdminAuditTui.js';
import { DeletedUsersTui } from './DeletedUsersTui.js';
import { LoginAuditTui } from './LoginAuditTui.js';
import type { WorkspaceReportCommandDeps, WorkspaceUserCommandDeps } from './commands.js';

export interface WorkspaceReportTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  onCancel?: () => void;
}

function ReportPlaceholder({ title, onCancel }: { title: string; onCancel?: () => void }) {
  useInput((_input, key) => {
    if (key.escape) {
      onCancel?.();
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Text color="yellow">Not implemented yet</Text>
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return</Text>
      </Box>
    </Box>
  );
}

export function WorkspaceReportTui({ reportDeps, userDeps, onCancel }: WorkspaceReportTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Reports']);
      setHelpLines(['↑/↓ select · Enter open · ? help · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'Deleted Users', value: 'deleted-users' },
    { label: 'Login Audit', value: 'login-audit' },
    { label: 'Admin Audit', value: 'admin-audit' },
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

  if (activeView === 'deleted-users') {
    return (
      <DeletedUsersTui
        reportDeps={reportDeps}
        userDeps={userDeps}
        days={20}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'login-audit') {
    return (
      <LoginAuditTui
        reportDeps={reportDeps}
        days={30}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  if (activeView === 'admin-audit') {
    return (
      <AdminAuditTui
        reportDeps={reportDeps}
        days={30}
        onCancel={() => setActiveView(null)}
      />
    );
  }

  return (
    <TuiScreenShell title="Reports">
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}