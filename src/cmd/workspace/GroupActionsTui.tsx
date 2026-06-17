import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { TuiWizard } from '../tui/TuiWizard.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { translateApiError } from '../tui/translateApiError.js';
import type { WorkspaceGroupCommandDeps } from './commands.js';

export interface GroupActionsTuiProps {
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  prefillGroupEmail?: string;
  onViewMembers?: (groupEmail: string) => void;
  onCancel?: () => void;
}

type ConfirmPhase = 'confirm' | 'running' | 'result';

interface PrefillConfirmActionProps {
  title: string;
  message: string;
  destructive?: boolean;
  onAction: () => Promise<string>;
  onCancel: () => void;
}

function PrefillConfirmAction({
  title,
  message,
  destructive = false,
  onAction,
  onCancel,
}: PrefillConfirmActionProps) {
  const [phase, setPhase] = useState<ConfirmPhase>('confirm');
  const [resultMessage, setResultMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useInput((_input, key) => {
    if (phase === 'result' && key.escape) {
      onCancel();
    }
  });

  if (phase === 'running') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Text bold color="cyan">{title}</Text>
        <Text color="yellow">Working...</Text>
      </Box>
    );
  }

  if (phase === 'result') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
        <Text bold color="cyan">{title}</Text>
        <Text color="green">{resultMessage}</Text>
        <Box marginTop={1}>
          <Text color="gray">ESC to close</Text>
        </Box>
      </Box>
    );
  }

  const displayMessage = errorMessage ? `${message}\n\nPrevious error: ${errorMessage}` : message;

  return (
    <TuiConfirmPrompt
      title={title}
      message={displayMessage}
      {...(destructive ? { destructive: true } : {})}
      onCancel={onCancel}
      onConfirm={async () => {
        setPhase('running');
        setErrorMessage(null);
        try {
          const msg = await onAction();
          setResultMessage(msg);
          setPhase('result');
        } catch (err: unknown) {
          setErrorMessage(translateApiError(err));
          setPhase('confirm');
        }
      }}
    />
  );
}

export function GroupActionsTui({
  groupDeps,
  prefillGroupEmail,
  onViewMembers,
  onCancel,
}: GroupActionsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Groups', 'Actions']);
      setHelpLines(['↑/↓ select · Enter open · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'View Members', value: 'view-members' },
    { label: 'Delete Group', value: 'delete-group' },
    { label: 'Add Member', value: 'add-member' },
    { label: 'Remove Member', value: 'remove-member' },
  ];

  const handleSelect = (item: { value: string }) => {
    if (item.value === 'view-members' && prefillGroupEmail && onViewMembers) {
      onViewMembers(prefillGroupEmail);
      onCancel?.();
      return;
    }
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

  const backToMenu = () => setActiveView(null);

  if (activeView === 'delete-group') {
    if (prefillGroupEmail) {
      return (
        <PrefillConfirmAction
          title="Delete Group"
          message={`Permanently delete group ${prefillGroupEmail}? This cannot be undone.`}
          destructive
          onCancel={backToMenu}
          onAction={async () => {
            const result = await groupDeps.deleteGroup(prefillGroupEmail);
            if (!result.applied) {
              throw new Error('Failed to delete group');
            }
            return `Group deleted: ${result.email}`;
          }}
        />
      );
    }

    return (
      <TuiWizard
        title="Delete Group"
        destructive
        fields={[
          {
            key: 'email',
            label: 'Group Email',
            required: true,
            placeholder: 'group@domain.com',
          },
        ]}
        summary={(values) => `Delete group: ${values.email}`}
        onCancel={backToMenu}
        onSubmit={async (values) => {
          const email = (values.email ?? '').trim();
          const result = await groupDeps.deleteGroup(email);
          if (!result.applied) {
            throw new Error('Failed to delete group');
          }
          return `Group deleted: ${result.email}`;
        }}
      />
    );
  }

  if (activeView === 'add-member') {
    return (
      <TuiWizard
        title="Add Group Member"
        fields={[
          ...(prefillGroupEmail
            ? []
            : [{
                key: 'groupEmail',
                label: 'Group Email',
                required: true,
                placeholder: 'group@domain.com',
              }]),
          {
            key: 'memberEmail',
            label: 'Member Email',
            required: true,
            placeholder: 'member@domain.com',
          },
          {
            key: 'role',
            label: 'Role',
            initialValue: 'MEMBER',
            placeholder: 'MEMBER, MANAGER, or OWNER',
          },
        ]}
        summary={(values) => {
          const groupEmail = prefillGroupEmail ?? values.groupEmail;
          const role = (values.role ?? 'MEMBER').trim() || 'MEMBER';
          return `Add ${values.memberEmail} to ${groupEmail} as ${role}`;
        }}
        onCancel={backToMenu}
        onSubmit={async (values) => {
          const groupEmail = (prefillGroupEmail ?? values.groupEmail ?? '').trim();
          const memberEmail = (values.memberEmail ?? '').trim();
          const role = (values.role ?? 'MEMBER').trim() || 'MEMBER';
          const validRoles = ['MEMBER', 'MANAGER', 'OWNER'];
          if (!validRoles.includes(role.toUpperCase())) {
            throw new Error('Role must be MEMBER, MANAGER, or OWNER');
          }
          const result = await groupDeps.addGroupMember(groupEmail, memberEmail, role.toUpperCase());
          if (!result.applied) {
            throw new Error('Failed to add group member');
          }
          return `Member added: ${result.memberEmail} (${result.role}) to ${result.groupEmail}`;
        }}
      />
    );
  }

  if (activeView === 'remove-member') {
    return (
      <TuiWizard
        title="Remove Group Member"
        destructive
        fields={[
          ...(prefillGroupEmail
            ? []
            : [{
                key: 'groupEmail',
                label: 'Group Email',
                required: true,
                placeholder: 'group@domain.com',
              }]),
          {
            key: 'memberEmail',
            label: 'Member Email',
            required: true,
            placeholder: 'member@domain.com',
          },
        ]}
        summary={(values) => {
          const groupEmail = prefillGroupEmail ?? values.groupEmail;
          return `Remove ${values.memberEmail} from ${groupEmail}`;
        }}
        onCancel={backToMenu}
        onSubmit={async (values) => {
          const groupEmail = (prefillGroupEmail ?? values.groupEmail ?? '').trim();
          const memberEmail = (values.memberEmail ?? '').trim();
          const result = await groupDeps.removeGroupMember(groupEmail, memberEmail);
          if (!result.applied) {
            throw new Error('Failed to remove group member');
          }
          return `Member removed: ${result.memberEmail} from ${result.groupEmail}`;
        }}
      />
    );
  }

  const subtitle = prefillGroupEmail ? prefillGroupEmail : undefined;

  return (
    <TuiScreenShell
      title="Group Actions"
      {...(subtitle ? { subtitle } : {})}
    >
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}