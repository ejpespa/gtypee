import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { TuiKeybar } from '../tui/TuiKeybar.js';
import { TuiScreenShell } from '../tui/TuiScreenShell.js';
import { adminUserSecurityUrl, adminUserUrl } from '../tui/resourceLinks.js';
import { copyToClipboard, openInBrowser } from '../tui/systemActions.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { RecoveryInfoWizard } from './RecoveryInfoWizard.js';
import { UserActionsTui } from './UserActionsTui.js';
import { UserGroupsTui } from './UserGroupsTui.js';
import { UserDevicesTui } from './UserDevicesTui.js';
import { LoginAuditTui } from './LoginAuditTui.js';
import { AdminAuditTui } from './AdminAuditTui.js';
import type {
  UserRecoveryInfo,
  WorkspaceUser,
  WorkspaceUserCommandDeps,
  WorkspaceGroupCommandDeps,
  WorkspaceDeviceCommandDeps,
  WorkspaceReportCommandDeps,
} from './commands.js';

export interface UserHubTuiProps {
  user: WorkspaceUser;
  userDeps: Required<WorkspaceUserCommandDeps>;
  groupDeps: Required<WorkspaceGroupCommandDeps>;
  deviceDeps: Required<WorkspaceDeviceCommandDeps>;
  reportDeps: Required<WorkspaceReportCommandDeps>;
  breadcrumbRoot?: string[]; // default ['Workspace', 'Users']
  onCancel?: () => void;
}

type HubView =
  | { kind: 'hub' }
  | { kind: 'related'; target: 'groups' | 'devices' | 'login-audit' | 'admin-audit' }
  | { kind: 'actions' }
  | { kind: 'recovery' };

const RELATED_ITEMS = [
  { label: 'Groups', value: 'groups' },
  { label: 'Devices', value: 'devices' },
  { label: 'Login audit (30d)', value: 'login-audit' },
  { label: 'Admin audit (30d)', value: 'admin-audit' },
] as const;

export function UserHubTui({
  user,
  userDeps,
  groupDeps,
  deviceDeps,
  reportDeps,
  breadcrumbRoot = ['Workspace', 'Users'],
  onCancel,
}: UserHubTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();
  const [view, setView] = useState<HubView>({ kind: 'hub' });
  const [aliases, setAliases] = useState<string[] | null>(null);
  const [recovery, setRecovery] = useState<UserRecoveryInfo | null>(null);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const recoverySavedRef = useRef(false);
  const actions = useDetailActions();

  useEffect(() => {
    let active = true;
    recoverySavedRef.current = false;
    if (userDeps.listAliases) {
      userDeps
        .listAliases(user.primaryEmail)
        .then((list) => {
          if (active) setAliases(list);
        })
        .catch(() => {
          if (active) setAliases([]);
        });
    } else {
      setAliases([]);
    }
    userDeps
      .getUserRecovery(user.primaryEmail)
      .then((info) => {
        if (active && !recoverySavedRef.current) {
          setRecovery(info);
          setRecoveryFailed(false);
        }
      })
      .catch(() => {
        if (active && !recoverySavedRef.current) {
          setRecovery({});
          setRecoveryFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [user.primaryEmail, userDeps]);

  useEffect(() => {
    if (view.kind !== 'hub') return;
    setBreadcrumbs([...breadcrumbRoot, user.primaryEmail]);
    setHelpLines([
      'Enter — open related view for this user',
      'a — user actions (password, suspend, …)',
      'e — edit recovery info (email, phone)',
      'o — open in Admin Console · c — copy email · l — login challenge',
      'ESC — back to user list',
      'Related: groups, devices, login audit, admin audit (30 days)',
    ]);
  }, [breadcrumbRoot, setBreadcrumbs, setHelpLines, user.primaryEmail, view.kind]);

  const profileLines = useMemo(() => {
    const fullName =
      [user.name.givenName, user.name.familyName].filter(Boolean).join(' ') || '(none)';
    let aliasLine = 'Loading aliases…';
    if (aliases !== null) {
      aliasLine =
        aliases.length > 0
          ? aliases.length > 8
            ? `${aliases.slice(0, 8).join(', ')} +${aliases.length - 8} more`
            : aliases.join(', ')
          : '(none)';
    }
    return [
      `Email: ${user.primaryEmail}`,
      `Name: ${fullName}`,
      `Org unit: ${user.orgUnitPath}`,
      `Admin: ${user.isAdmin ? 'yes' : 'no'}`,
      `Suspended: ${user.suspended ? 'yes' : 'no'}`,
      `Last login: ${user.lastLoginTime ?? 'unknown'}`,
      `Recovery email: ${recoveryFailed ? '(unknown)' : recovery === null ? 'loading…' : recovery.recoveryEmail ?? '(none)'}`,
      `Recovery phone: ${recoveryFailed ? '(unknown)' : recovery === null ? 'loading…' : recovery.recoveryPhone ?? '(none)'}`,
      `User ID: ${user.id}`,
      `Aliases: ${aliasLine}`,
    ];
  }, [aliases, recovery, recoveryFailed, user]);

  useInput((input, key) => {
    if (view.kind !== 'hub' || actions.actionBusy) return;
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (input === 'a') {
      setView({ kind: 'actions' });
      return;
    }
    if (input === 'e') {
      setView({ kind: 'recovery' });
      return;
    }
    if (input === 'c') {
      void actions.runAction(async () => {
        await copyToClipboard(user.primaryEmail);
        return `Copied email: ${user.primaryEmail}`;
      });
      return;
    }
    if (input === 'o') {
      void actions.runAction(async () => {
        const userKey = user.id || user.primaryEmail;
        await openInBrowser(adminUserUrl(userKey));
        return 'Opened in Admin Console';
      });
      return;
    }
    if (input === 'l') {
      void actions.runAction(async () => {
        const userKey = user.id || user.primaryEmail;
        await openInBrowser(adminUserSecurityUrl(userKey));
        return `Opened Security for ${user.primaryEmail}. Click Login challenge → Turn Off For 10 Minutes.`;
      });
    }
  });

  const backToHub = useCallback(() => setView({ kind: 'hub' }), []);

  if (view.kind === 'recovery') {
    return (
      <RecoveryInfoWizard
        userDeps={userDeps}
        email={user.primaryEmail}
        current={recovery ?? {}}
        onSaved={(info) => {
          recoverySavedRef.current = true;
          setRecovery((prev) => ({ ...prev, ...info }));
          setRecoveryFailed(false);
        }}
        onCancel={backToHub}
      />
    );
  }

  if (view.kind === 'actions') {
    return (
      <UserActionsTui
        userDeps={userDeps}
        prefillEmail={user.primaryEmail}
        onCancel={backToHub}
      />
    );
  }

  if (view.kind === 'related') {
    if (view.target === 'groups') {
      return (
        <UserGroupsTui
          groupDeps={groupDeps}
          userEmail={user.primaryEmail}
          onCancel={backToHub}
        />
      );
    }
    if (view.target === 'devices') {
      return (
        <UserDevicesTui
          deviceDeps={deviceDeps}
          userEmail={user.primaryEmail}
          onCancel={backToHub}
        />
      );
    }
    if (view.target === 'login-audit') {
      return (
        <LoginAuditTui
          reportDeps={reportDeps}
          days={30}
          filterUserEmail={user.primaryEmail}
          onCancel={backToHub}
        />
      );
    }
    return (
      <AdminAuditTui
        reportDeps={reportDeps}
        days={30}
        filterUserEmail={user.primaryEmail}
        onCancel={backToHub}
      />
    );
  }

  // hub home
  return (
    <TuiScreenShell title={`User · ${user.primaryEmail}`}>
      <Box flexDirection="column" marginBottom={1}>
        {profileLines.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Related
        </Text>
      </Box>
      <SelectInput
        items={RELATED_ITEMS.map((i) => ({ label: i.label, value: i.value }))}
        onSelect={(item) => {
          setView({
            kind: 'related',
            target: item.value as 'groups' | 'devices' | 'login-audit' | 'admin-audit',
          });
        }}
      />
      {actions.actionStatus ? (
        <Box marginTop={1}>
          <Text color="green">{actions.actionStatus}</Text>
        </Box>
      ) : null}
      <TuiKeybar detailEnabled={false} refreshEnabled={false} />
      <Text color="gray">a actions · e recovery · o Admin · c copy · l challenge · ESC back</Text>
    </TuiScreenShell>
  );
}
