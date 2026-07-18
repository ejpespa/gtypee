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
import type { AdminActivity, WorkspaceReportCommandDeps } from './commands.js';
import { filterRowsByUserEmail } from './userHubFilters.js';

export interface AdminAuditTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days?: number;
  filterUserEmail?: string;
  onCancel?: () => void;
}

function activityKey(activity: AdminActivity): string {
  return `${activity.timestamp}|${activity.userEmail}|${activity.action}|${activity.resource}`;
}

function formatActivityLabel(activity: AdminActivity): string {
  return `${activity.userEmail || '(unknown)'}  ${activity.action || '(no action)'}  ${activity.resource || '(no resource)'}  ${activity.timestamp}`;
}

export function AdminAuditTui({ reportDeps, days = 30, filterUserEmail, onCancel }: AdminAuditTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<AdminActivity | null>(null);

  const detail = useDetailView();
  const actions = useDetailActions();

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    setBreadcrumbs(
      filterUserEmail
        ? ['Workspace', 'Users', filterUserEmail, 'Admin audit']
        : ['Workspace', 'Reports', 'Admin Audit'],
    );
    setHelpLines([
      ...(filterUserEmail ? [`Scoped to ${filterUserEmail}`] : []),
      '/ or s — search',
      'Enter — view admin event',
      'c — copy admin email in detail',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines, filterUserEmail]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    reportDeps.getAdminAudit(days)
      .then((items) => {
        if (!active) return;
        setActivities(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve admin audit');
        setLoading(false);
      });

    return () => { active = false; };
  }, [reportDeps, days]);

  const scopedActivities = filterUserEmail
    ? filterRowsByUserEmail(activities, filterUserEmail)
    : activities;

  const filteredActivities = filterItemsByQuery(
    scopedActivities,
    appliedSearch,
    (activity) => [activity.userEmail, activity.action, activity.resource],
  );

  const { slice: visibleActivities, hasNextPage } = sliceLocalPage(
    filteredActivities,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / DEFAULT_TUI_PAGE_SIZE));

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedActivity(null);
  }, [actions, detail]);

  const handleSelectActivity = useCallback(async (activityId: string) => {
    const activity = filteredActivities.find((item) => activityKey(item) === activityId);
    if (!activity) return;

    actions.resetStatus();
    setSelectedActivity(activity);

    await detail.open({
      title: activity.userEmail || activity.action || 'Admin event',
      load: async () => [
        `Time: ${activity.timestamp || '(unknown)'}`,
        `Admin: ${activity.userEmail || '(unknown)'}`,
        `Event: ${activity.action || '(no action)'}`,
        `Parameters: ${activity.resource || '(none)'}`,
      ],
    });
  }, [actions, detail, filteredActivities]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedActivity) return [];

    const adminEmail = selectedActivity.userEmail.trim();

    return [
      {
        key: 'c',
        label: 'copy admin email',
        disabled: !adminEmail,
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(adminEmail);
          return `Copied email: ${adminEmail}`;
        }),
      },
    ];
  }, [actions, selectedActivity]);

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
        title={detail.title ?? 'Admin event'}
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

  const emptyMessage = filterUserEmail
    ? (appliedSearch
      ? `No activities match "${appliedSearch}". Clear search to see all results.`
      : `No admin events for ${filterUserEmail} in the last ${days} days.`)
    : scopedActivities.length === 0
      ? 'No admin activities found.'
      : appliedSearch
        ? `No activities match "${appliedSearch}". Clear search to see all results.`
        : 'No admin activities found.';

  return (
    <TuiListScreen
      title={`Admin Audit (last ${days} days)`}
      pageLabel={`Page ${currentIndex + 1}/${totalPages} · ${filteredActivities.length} total`}
      items={visibleActivities}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectActivity}
      formatLabel={formatActivityLabel}
      getId={activityKey}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="press / or s to edit · Enter to apply · ESC to cancel · filters all results"
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