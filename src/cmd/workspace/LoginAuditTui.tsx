import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceReportCommandDeps, LoginActivity } from './commands.js';

export interface LoginAuditTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days?: number;
  onCancel?: () => void;
}

function loginKey(login: LoginActivity): string {
  return `${login.timestamp}|${login.userEmail}|${login.ipAddress}|${login.success}`;
}

function formatLoginLabel(login: LoginActivity): string {
  const status = login.success ? '✓' : '✗';
  return `${login.userEmail}  ${status}  ${login.ipAddress}  ${login.timestamp}`;
}

function formatLoginEvent(login: LoginActivity): string {
  return login.success ? 'login_success' : 'login_failure';
}

export function LoginAuditTui({ reportDeps, days = 30, onCancel }: LoginAuditTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [selectedLogin, setSelectedLogin] = useState<LoginActivity | null>(null);

  const detail = useDetailView();
  const actions = useDetailActions();

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Reports', 'Login Audit']);
    setHelpLines([
      '/ or s — search',
      'Enter — view login event',
      'c — copy email in detail',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    reportDeps.getLoginAudit(days)
      .then((items) => {
        if (!active) return;
        setLogins(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve login audit');
        setLoading(false);
      });

    return () => { active = false; };
  }, [reportDeps, days]);

  const filteredLogins = filterItemsByQuery(
    logins,
    appliedSearch,
    (login) => [login.userEmail, login.ipAddress],
  );
  const { slice: visibleLogins, hasNextPage } = sliceLocalPage(
    filteredLogins,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogins.length / DEFAULT_TUI_PAGE_SIZE));

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedLogin(null);
  }, [actions, detail]);

  const handleSelectLogin = useCallback(async (loginId: string) => {
    const login = filteredLogins.find((item) => loginKey(item) === loginId);
    if (!login) return;

    actions.resetStatus();
    setSelectedLogin(login);

    await detail.open({
      title: login.userEmail || login.ipAddress || 'Login event',
      load: async () => [
        `Time: ${login.timestamp || '(unknown)'}`,
        `User: ${login.userEmail || '(unknown)'}`,
        `IP: ${login.ipAddress || '(unknown)'}`,
        `Event: ${formatLoginEvent(login)}`,
      ],
    });
  }, [actions, detail, filteredLogins]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedLogin) return [];

    const copyValue = selectedLogin.userEmail.trim() || selectedLogin.ipAddress.trim();
    const copyLabel = selectedLogin.userEmail.trim() ? 'copy email' : 'copy IP';

    return [
      {
        key: 'c',
        label: copyLabel,
        disabled: !copyValue,
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(copyValue);
          return selectedLogin.userEmail.trim()
            ? `Copied email: ${copyValue}`
            : `Copied IP: ${copyValue}`;
        }),
      },
    ];
  }, [actions, selectedLogin]);

  const blocked = isEditingSearch || detail.isOpen;

  useInput((input, key) => {
    if (detail.isOpen) return;

    if (isEditingSearch) {
      if (key.escape) {
        setSearchDraft(appliedSearch);
        setIsEditingSearch(false);
      }
      return;
    }

    if (key.escape) {
      onCancel?.();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Login event'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailPanelActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

  const emptyMessage = logins.length === 0
    ? 'No login activity found.'
    : appliedSearch
      ? `No logins match "${appliedSearch}". Try clearing search.`
      : 'No login activity found.';

  return (
    <TuiListScreen
      title={`Login Audit (last ${days} days)`}
      pageLabel={`Page ${currentIndex + 1}/${totalPages} · ${filteredLogins.length} total`}
      items={visibleLogins}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectLogin}
      formatLabel={formatLoginLabel}
      getId={loginKey}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="press / or s to edit · Enter to apply · ESC to cancel"
        />
      )}
      emptyMessage={emptyMessage}
      onPagination={(action) => {
        if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
        if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
      }}
      blocked={blocked}
    />
  );
}