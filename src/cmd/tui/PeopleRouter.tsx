import React, { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiDetailPanel } from './TuiDetailPanel.js';
import { ListPeopleTui } from '../people/ListPeopleTui.js';
import { formatPeopleMe } from '../people/commands.js';
import { useDetailView } from './hooks/useDetailView.js';
import type { PeopleCommandDeps } from '../people/commands.js';

interface PeopleRouterProps {
  deps: Required<PeopleCommandDeps>;
  onCancel: () => void;
}

export function PeopleRouter({ deps, onCancel }: PeopleRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const detail = useDetailView();

  const items = [
    { label: 'My Profile', value: 'me' },
    { label: 'Search People', value: 'search' },
  ];

  const loadProfile = useCallback(async () => {
    await detail.open({
      title: 'My Profile',
      load: async () => {
        const profile = await deps.me();
        return formatPeopleMe(profile, 'human').split('\n');
      },
    });
  }, [deps, detail]);

  useInput((_input, key) => {
    if (activeSubMenu === null && !detail.isOpen && key.escape) {
      onCancel();
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Profile'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={() => {
          detail.clear();
          setActiveSubMenu(null);
        }}
      />
    );
  }

  if (activeSubMenu === 'search') {
    return (
      <ListPeopleTui
        peopleDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">People</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === 'me') {
            void loadProfile();
            return;
          }
          setActiveSubMenu(item.value);
        }}
      />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}