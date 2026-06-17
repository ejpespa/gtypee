import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiConfirmPrompt } from '../tui/TuiConfirmPrompt.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { translateApiError } from '../tui/translateApiError.js';
import { SuspendUserWizard } from './SuspendUserWizard.js';
import { UnsuspendUserWizard } from './UnsuspendUserWizard.js';
import { ResetPasswordWizard } from './ResetPasswordWizard.js';
import { GenerateBackupCodesWizard } from './GenerateBackupCodesWizard.js';
import { SetOrgUnitWizard } from './SetOrgUnitWizard.js';
import { DeleteUserWizard } from './DeleteUserWizard.js';
import { AddAliasWizard } from './AddAliasWizard.js';
import { DeleteAliasWizard } from './DeleteAliasWizard.js';
import { GrantAdminWizard } from './GrantAdminWizard.js';
import { RevokeAdminWizard } from './RevokeAdminWizard.js';
import { DeletePhotoWizard } from './DeletePhotoWizard.js';
import { TurnOffLoginChallengeWizard } from './TurnOffLoginChallengeWizard.js';
import { adminUserSecurityUrl } from '../tui/resourceLinks.js';
import { openInBrowser } from '../tui/systemActions.js';
import type { WorkspaceUserCommandDeps } from './commands.js';

export interface UserActionsTuiProps {
  userDeps: Required<WorkspaceUserCommandDeps>;
  prefillEmail?: string;
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

export function UserActionsTui({ userDeps, prefillEmail, onCancel }: UserActionsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === null) {
      setBreadcrumbs(['Workspace', 'Users', 'Actions']);
      setHelpLines(['↑/↓ select · Enter open · ESC back']);
    }
  }, [activeView, setBreadcrumbs, setHelpLines]);

  const items = [
    { label: 'Reset Password', value: 'reset-password' },
    { label: 'Generate Backup Codes', value: 'generate-backup-codes' },
    { label: 'Turn Off Login Challenge (10 min)', value: 'turn-off-login-challenge' },
    { label: 'Suspend User', value: 'suspend-user' },
    { label: 'Unsuspend User', value: 'unsuspend-user' },
    { label: 'Grant Admin', value: 'grant-admin' },
    { label: 'Revoke Admin', value: 'revoke-admin' },
    { label: 'Set Org Unit', value: 'set-org-unit' },
    { label: 'Delete User', value: 'delete-user' },
    { label: 'Add Alias', value: 'add-alias' },
    { label: 'Delete Alias', value: 'delete-alias' },
    { label: 'Delete Photo', value: 'delete-photo' },
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

  const wizardPrefill = prefillEmail ? { prefillEmail } : {};
  const backToMenu = () => setActiveView(null);

  if (activeView === 'reset-password') {
    return (
      <ResetPasswordWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'generate-backup-codes') {
    return (
      <GenerateBackupCodesWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'turn-off-login-challenge') {
    if (prefillEmail) {
      return (
        <PrefillConfirmAction
          title="Turn Off Login Challenge (10 min)"
          message={[
            `Open login challenge settings for ${prefillEmail}?`,
            '',
            'Google has no public API for this. Admin Console will open on Security.',
            'Click Login challenge → Turn Off For 10 Minutes.',
          ].join('\n')}
          onCancel={backToMenu}
          onAction={async () => {
            await openInBrowser(adminUserSecurityUrl(prefillEmail));
            return `Opened Security for ${prefillEmail}. Click Login challenge → Turn Off For 10 Minutes.`;
          }}
        />
      );
    }
    return (
      <TurnOffLoginChallengeWizard
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'suspend-user') {
    return (
      <SuspendUserWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'unsuspend-user') {
    return (
      <UnsuspendUserWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'grant-admin') {
    if (prefillEmail) {
      return (
        <PrefillConfirmAction
          title="Grant Admin"
          message={`Grant admin privileges to ${prefillEmail}?`}
          onCancel={backToMenu}
          onAction={async () => {
            const result = await userDeps.setAdmin(prefillEmail, true);
            if (!result.applied) {
              throw new Error('Failed to grant admin privileges');
            }
            return `Admin privileges granted to ${result.email}`;
          }}
        />
      );
    }
    return <GrantAdminWizard userDeps={userDeps} onCancel={backToMenu} />;
  }

  if (activeView === 'revoke-admin') {
    if (prefillEmail) {
      return (
        <PrefillConfirmAction
          title="Revoke Admin"
          message={`Revoke admin privileges from ${prefillEmail}?`}
          destructive
          onCancel={backToMenu}
          onAction={async () => {
            const result = await userDeps.setAdmin(prefillEmail, false);
            if (!result.applied) {
              throw new Error('Failed to revoke admin privileges');
            }
            return `Admin privileges revoked for ${result.email}`;
          }}
        />
      );
    }
    return <RevokeAdminWizard userDeps={userDeps} onCancel={backToMenu} />;
  }

  if (activeView === 'set-org-unit') {
    return (
      <SetOrgUnitWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'delete-user') {
    return (
      <DeleteUserWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'add-alias') {
    return (
      <AddAliasWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'delete-alias') {
    return (
      <DeleteAliasWizard
        userDeps={userDeps}
        {...wizardPrefill}
        onCancel={backToMenu}
      />
    );
  }

  if (activeView === 'delete-photo') {
    if (prefillEmail) {
      return (
        <PrefillConfirmAction
          title="Delete Photo"
          message={`Delete profile photo for ${prefillEmail}?`}
          destructive
          onCancel={backToMenu}
          onAction={async () => {
            const result = await userDeps.deletePhoto(prefillEmail);
            if (!result.applied) {
              throw new Error('Failed to delete photo');
            }
            return `Photo deleted for ${result.email}`;
          }}
        />
      );
    }
    return <DeletePhotoWizard userDeps={userDeps} onCancel={backToMenu} />;
  }

  const subtitle = prefillEmail ? prefillEmail : undefined;

  return (
    <TuiScreenShell
      title="User Actions"
      {...(subtitle ? { subtitle } : {})}
    >
      <SelectInput items={items} onSelect={handleSelect} />
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
    </TuiScreenShell>
  );
}