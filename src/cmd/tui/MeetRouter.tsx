import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListMeetTui } from '../meet/ListMeetTui.js';
import type { CalendarCommandDeps } from '../calendar/commands.js';

interface MeetRouterProps {
  calendarDeps: Required<CalendarCommandDeps>;
  onCancel: () => void;
}

export function MeetRouter({ calendarDeps, onCancel }: MeetRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'Upcoming Meetings', value: 'upcoming' },
  ];

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'upcoming') {
    return (
      <ListMeetTui
        calendarDeps={calendarDeps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Meet</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => setActiveSubMenu(item.value)} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}