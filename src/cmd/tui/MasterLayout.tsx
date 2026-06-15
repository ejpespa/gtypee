import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { DeletedUsersTui } from '../workspace/DeletedUsersTui.js';
import type { WorkspaceReportCommandDeps } from '../workspace/commands.js';

interface MasterLayoutProps {
  workspaceDeps: Required<WorkspaceReportCommandDeps>;
}

const items = [
  { label: 'Workspace Admin', value: 'workspace' },
  { label: 'Gmail', value: 'gmail' },
  { label: 'Drive', value: 'drive' },
  { label: 'Calendar', value: 'calendar' }
];

export function MasterLayout({ workspaceDeps }: MasterLayoutProps) {
  const { exit } = useApp();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useInput((input, key) => {
    if (activeMenu === null && (input === 'q' || key.escape)) {
      exit();
    }
  });

  const handleSelect = (item: { value: string }) => {
    setActiveMenu(item.value);
  };

  const handleBack = () => {
    setActiveMenu(null);
  };

  return (
    <Box flexDirection="row" width="100%" height={20}>
      <Box
        flexDirection="column"
        width={30}
        borderStyle="round"
        borderColor={activeMenu === null ? "green" : "gray"}
        padding={1}
      >
        <Text bold>Services</Text>
        <Box marginTop={1}>
           {activeMenu === null ? (
             <SelectInput items={items} onSelect={handleSelect} />
           ) : (
             <Box flexDirection="column">
               {items.map(i => (
                 <Text key={i.value} color={i.value === activeMenu ? "cyan" : "gray"}>
                   {i.value === activeMenu ? `> ${i.label}` : `  ${i.label}`}
                 </Text>
               ))}
             </Box>
           )}
        </Box>
        {activeMenu === null && (
          <Box marginTop={1}><Text color="gray">'q' to quit</Text></Box>
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="blue" padding={1}>
        {activeMenu === null && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text>Select a service from the sidebar</Text>
          </Box>
        )}

        {activeMenu === 'workspace' && (
          <Box flexDirection="column" width="100%">
             <DeletedUsersTui
               reportDeps={workspaceDeps}
               days={30}
               searchOpts={{}}
               onCancel={handleBack}
             />
          </Box>
        )}

        {activeMenu !== null && activeMenu !== 'workspace' && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="yellow">Module '{activeMenu}' coming soon...</Text>
            <Box marginTop={2}><Text color="gray">Press ESC to return</Text></Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function MasterLayoutWrapper(props: MasterLayoutProps) {
  return <MasterLayout {...props} />;
}
