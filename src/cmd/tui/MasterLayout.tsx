import React, { useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import SelectInput from 'ink-select-input';
import { WorkspaceRouter } from './WorkspaceRouter.js';
import { GmailRouter } from './GmailRouter.js';
import { CalendarRouter } from './CalendarRouter.js';
import { DriveRouter } from './DriveRouter.js';
import type { WorkspaceDeviceCommandDeps, WorkspaceReportCommandDeps, WorkspaceUserCommandDeps, WorkspaceGroupCommandDeps, WorkspaceOrgUnitCommandDeps } from '../workspace/commands.js';
import type { GmailCommandDeps } from '../gmail/commands.js';
import type { CalendarCommandDeps } from '../calendar/commands.js';
import type { DriveCommandDeps } from '../drive/commands.js';

export interface TuiConfigDeps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  orgDeps: Required<WorkspaceOrgUnitCommandDeps>;
  gmailDeps: Required<GmailCommandDeps>;
  calendarDeps: Required<CalendarCommandDeps>;
  driveDeps: Required<DriveCommandDeps>;
}

interface MasterLayoutProps {
  deps: TuiConfigDeps;
}

const items = [
  { label: 'Workspace Admin', value: 'workspace' },
  { label: 'Gmail', value: 'gmail' },
  { label: 'Drive', value: 'drive' },
  { label: 'Calendar', value: 'calendar' }
];

export function MasterLayout({ deps }: MasterLayoutProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalHeight = stdout.rows > 0 ? stdout.rows : 24;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useInput((input, key) => {
    // Top-level exit
    if (activeMenu === null && (input === 'q' || key.escape)) {
      exit();
      return;
    }

    // Sub-menu exit (Back to main layout) for placeholders
    if (
      activeMenu !== null &&
      activeMenu !== 'workspace' &&
      activeMenu !== 'gmail' &&
      activeMenu !== 'calendar' &&
      activeMenu !== 'drive' &&
      key.escape
    ) {
      handleBack();
      return;
    }
  });

  const handleSelect = (item: { value: string }) => {
    setActiveMenu(item.value);
  };

  const handleBack = () => {
    setActiveMenu(null);
  };

  return (
    <Box flexDirection="row" width="100%" height={terminalHeight}>
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

      <Box flexDirection="column" flexGrow={1} height="100%" borderStyle="round" borderColor="blue" padding={1}>
        {activeMenu === null && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text>Select a service from the sidebar</Text>
          </Box>
        )}

        {activeMenu === 'workspace' && (
          <Box flexDirection="column" width="100%">
             <WorkspaceRouter
               deps={deps}
               onCancel={handleBack}
             />
          </Box>
        )}

        {activeMenu === 'gmail' && (
          <Box flexDirection="column" width="100%">
             <GmailRouter
               deps={deps.gmailDeps}
               onCancel={handleBack}
             />
          </Box>
        )}

        {activeMenu === 'calendar' && (
          <Box flexDirection="column" width="100%">
             <CalendarRouter
               deps={deps.calendarDeps}
               onCancel={handleBack}
             />
          </Box>
        )}

        {activeMenu === 'drive' && (
          <Box flexDirection="column" width="100%">
             <DriveRouter
               deps={deps.driveDeps}
               onCancel={handleBack}
             />
          </Box>
        )}

        {activeMenu !== null &&
          activeMenu !== 'workspace' &&
          activeMenu !== 'gmail' &&
          activeMenu !== 'calendar' &&
          activeMenu !== 'drive' && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="yellow">Module '{activeMenu}' coming soon...</Text>
            <Box marginTop={2}><Text color="gray">Press ESC to return</Text></Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
