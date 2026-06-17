import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListContactsTui } from '../contacts/ListContactsTui.js';
import type { ContactsCommandDeps } from '../contacts/commands.js';

interface ContactsRouterProps {
  deps: Required<ContactsCommandDeps>;
  onCancel: () => void;
}

export function ContactsRouter({ deps, onCancel }: ContactsRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Contacts', value: 'list' },
    { label: 'Search Contacts', value: 'search' },
  ];

  const handleSelect = (item: { value: string }) => {
    setActiveSubMenu(item.value);
  };

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListContactsTui
        contactsDeps={deps}
        title="List Contacts"
        mode="list"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  if (activeSubMenu === 'search') {
    return (
      <ListContactsTui
        contactsDeps={deps}
        title="Search Contacts"
        mode="search"
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Contacts</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}