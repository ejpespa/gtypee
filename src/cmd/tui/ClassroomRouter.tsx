import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ListClassroomTui } from '../classroom/ListClassroomTui.js';
import type { ClassroomCommandDeps } from '../classroom/commands.js';

interface ClassroomRouterProps {
  deps: Required<ClassroomCommandDeps>;
  onCancel: () => void;
}

export function ClassroomRouter({ deps, onCancel }: ClassroomRouterProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const items = [
    { label: 'List Courses', value: 'list' },
  ];

  useInput((_input, key) => {
    if (activeSubMenu === null && key.escape) {
      onCancel();
    }
  });

  if (activeSubMenu === 'list') {
    return (
      <ListClassroomTui
        classroomDeps={deps}
        onCancel={() => setActiveSubMenu(null)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Classroom</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => setActiveSubMenu(item.value)} />
      <Box marginTop={1}>
        <Text color="gray">Press ESC to return to services</Text>
      </Box>
    </Box>
  );
}