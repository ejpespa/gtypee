import React, { useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiNavigationProvider } from './TuiNavigationContext.js';
import { TuiAppChrome } from './TuiAppChrome.js';
import { HelpOverlay } from './HelpOverlay.js';
import { useTuiNavigation } from './TuiNavigationContext.js';
import { WorkspaceRouter } from './WorkspaceRouter.js';
import { GmailRouter } from './GmailRouter.js';
import { CalendarRouter } from './CalendarRouter.js';
import { DriveRouter } from './DriveRouter.js';
import { DocsRouter } from './DocsRouter.js';
import { SheetsRouter } from './SheetsRouter.js';
import { TasksRouter } from './TasksRouter.js';
import { ContactsRouter } from './ContactsRouter.js';
import { ChatRouter } from './ChatRouter.js';
import { SlidesRouter } from './SlidesRouter.js';
import { FormsRouter } from './FormsRouter.js';
import { KeepRouter } from './KeepRouter.js';
import { MeetRouter } from './MeetRouter.js';
import { PeopleRouter } from './PeopleRouter.js';
import { ClassroomRouter } from './ClassroomRouter.js';
import type { WorkspaceDeviceCommandDeps, WorkspaceReportCommandDeps, WorkspaceUserCommandDeps, WorkspaceGroupCommandDeps, WorkspaceOrgUnitCommandDeps } from '../workspace/commands.js';
import type { GmailAttachmentDeps, GmailCommandDeps, GmailDraftDeps, GmailThreadDeps } from '../gmail/commands.js';
import type { CalendarCommandDeps } from '../calendar/commands.js';
import type { DriveCommandDeps, DriveSharedDrivesDeps, DriveTrashDeps } from '../drive/commands.js';
import type { DocsCommandDeps } from '../docs/commands.js';
import type { SheetsCommandDeps } from '../sheets/commands.js';
import type { TasksCommandDeps } from '../tasks/commands.js';
import type { ContactsCommandDeps } from '../contacts/commands.js';
import type { ChatCommandDeps } from '../chat/commands.js';
import type { SlidesCommandDeps } from '../slides/commands.js';
import type { FormsCommandDeps } from '../forms/commands.js';
import type { KeepCommandDeps } from '../keep/commands.js';
import type { PeopleCommandDeps } from '../people/commands.js';
import type { ClassroomCommandDeps } from '../classroom/commands.js';

export interface TuiConfigDeps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  orgDeps: Required<WorkspaceOrgUnitCommandDeps>;
  gmailDeps: Required<GmailCommandDeps>;
  gmailAttachmentDeps: Required<GmailAttachmentDeps>;
  gmailDraftDeps: Required<GmailDraftDeps>;
  gmailThreadDeps: Required<GmailThreadDeps>;
  calendarDeps: Required<CalendarCommandDeps>;
  driveDeps: Required<DriveCommandDeps>;
  driveTrashDeps: Required<DriveTrashDeps>;
  driveSharedDrivesDeps: Required<DriveSharedDrivesDeps>;
  docsDeps: Required<DocsCommandDeps>;
  sheetsDeps: Required<SheetsCommandDeps>;
  tasksDeps: Required<TasksCommandDeps>;
  contactsDeps: Required<ContactsCommandDeps>;
  chatDeps: Required<ChatCommandDeps>;
  slidesDeps: Required<SlidesCommandDeps>;
  formsDeps: Required<FormsCommandDeps>;
  keepDeps: Required<KeepCommandDeps>;
  peopleDeps: Required<PeopleCommandDeps>;
  classroomDeps: Required<ClassroomCommandDeps>;
}

interface MasterLayoutProps {
  deps: TuiConfigDeps;
  accountEmail: string;
}

function MasterContentPane({
  deps,
  activeMenu,
  handleBack,
  showHelp,
  setShowHelp,
}: {
  deps: TuiConfigDeps;
  activeMenu: string | null;
  handleBack: () => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
}) {
  const { helpLines } = useTuiNavigation();

  return (
    <Box flexDirection="column" flexGrow={1} height="100%">
      <TuiAppChrome />
      {showHelp && (
        <HelpOverlay lines={helpLines} onClose={() => setShowHelp(false)} />
      )}
      {activeMenu === null && (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text>Select a service from the sidebar</Text>
        </Box>
      )}

      {activeMenu === 'workspace' && (
        <Box flexDirection="column" width="100%">
          <WorkspaceRouter deps={deps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'gmail' && (
        <Box flexDirection="column" width="100%">
          <GmailRouter
            deps={deps.gmailDeps}
            attachmentDeps={deps.gmailAttachmentDeps}
            draftDeps={deps.gmailDraftDeps}
            threadDeps={deps.gmailThreadDeps}
            onCancel={handleBack}
          />
        </Box>
      )}

      {activeMenu === 'calendar' && (
        <Box flexDirection="column" width="100%">
          <CalendarRouter deps={deps.calendarDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'drive' && (
        <Box flexDirection="column" width="100%">
          <DriveRouter
            deps={deps.driveDeps}
            trashDeps={deps.driveTrashDeps}
            sharedDrivesDeps={deps.driveSharedDrivesDeps}
            onCancel={handleBack}
          />
        </Box>
      )}

      {activeMenu === 'docs' && (
        <Box flexDirection="column" width="100%">
          <DocsRouter deps={deps.docsDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'sheets' && (
        <Box flexDirection="column" width="100%">
          <SheetsRouter deps={deps.sheetsDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'tasks' && (
        <Box flexDirection="column" width="100%">
          <TasksRouter deps={deps.tasksDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'contacts' && (
        <Box flexDirection="column" width="100%">
          <ContactsRouter deps={deps.contactsDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'chat' && (
        <Box flexDirection="column" width="100%">
          <ChatRouter deps={deps.chatDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'slides' && (
        <Box flexDirection="column" width="100%">
          <SlidesRouter deps={deps.slidesDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'forms' && (
        <Box flexDirection="column" width="100%">
          <FormsRouter deps={deps.formsDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'keep' && (
        <Box flexDirection="column" width="100%">
          <KeepRouter deps={deps.keepDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'meet' && (
        <Box flexDirection="column" width="100%">
          <MeetRouter calendarDeps={deps.calendarDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'people' && (
        <Box flexDirection="column" width="100%">
          <PeopleRouter deps={deps.peopleDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu === 'classroom' && (
        <Box flexDirection="column" width="100%">
          <ClassroomRouter deps={deps.classroomDeps} onCancel={handleBack} />
        </Box>
      )}

      {activeMenu !== null && !wiredMenus.has(activeMenu) && (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="yellow">Module '{activeMenu}' coming soon...</Text>
          <Box marginTop={2}><Text color="gray">Press ESC to return</Text></Box>
        </Box>
      )}
    </Box>
  );
}

const items = [
  { label: 'Workspace Admin', value: 'workspace' },
  { label: 'Gmail', value: 'gmail' },
  { label: 'Drive', value: 'drive' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Docs', value: 'docs' },
  { label: 'Sheets', value: 'sheets' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Contacts', value: 'contacts' },
  { label: 'Chat', value: 'chat' },
  { label: 'Slides', value: 'slides' },
  { label: 'Forms', value: 'forms' },
  { label: 'Keep', value: 'keep' },
  { label: 'Meet', value: 'meet' },
  { label: 'People', value: 'people' },
  { label: 'Classroom', value: 'classroom' },
];

const wiredMenus = new Set([
  'workspace',
  'gmail',
  'drive',
  'calendar',
  'docs',
  'sheets',
  'tasks',
  'contacts',
  'chat',
  'slides',
  'forms',
  'keep',
  'meet',
  'people',
  'classroom',
]);

export function MasterLayout({ deps, accountEmail }: MasterLayoutProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalHeight = stdout.rows > 0 ? stdout.rows : 24;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input, key) => {
    if (input === '?') {
      setShowHelp((v) => !v);
      return;
    }

    if (showHelp && key.escape) {
      setShowHelp(false);
      return;
    }

    if (activeMenu === null && (input === 'q' || key.escape)) {
      exit();
      return;
    }

    if (activeMenu !== null && !wiredMenus.has(activeMenu) && key.escape) {
      handleBack();
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
        <TuiNavigationProvider accountEmail={accountEmail}>
          <MasterContentPane
            deps={deps}
            activeMenu={activeMenu}
            handleBack={handleBack}
            showHelp={showHelp}
            setShowHelp={setShowHelp}
          />
        </TuiNavigationProvider>
      </Box>
    </Box>
  );
}