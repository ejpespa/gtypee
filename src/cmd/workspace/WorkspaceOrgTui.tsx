import React, { useEffect, useState } from 'react';
import { useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { CreateOrgWizard } from './CreateOrgWizard.js';
import { ListOrgsTui } from './ListOrgsTui.js';
import type { WorkspaceOrgUnitCommandDeps } from './commands.js';

export interface WorkspaceOrgTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

export function WorkspaceOrgTui({ orgDeps, onCancel }: WorkspaceOrgTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

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

  useInput((_input, key) => {
    if (activeView === null && key.escape) {
      if (onCancel) {
        onCancel();
      }
      return;
    }

    if (activeView !== null && key.escape) {
      setActiveView(null);
      return;
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
        onCancel={() => setActiveView(null)}
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