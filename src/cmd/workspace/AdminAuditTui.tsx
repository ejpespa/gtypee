import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  DEFAULT_TUI_PAGE_SIZE,
  sliceLocalPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import type { AdminActivity, WorkspaceReportCommandDeps } from './commands.js';

export interface AdminAuditTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days?: number;
  onCancel?: () => void;
}

function activityKey(activity: AdminActivity, index: number): string {
  return `${activity.timestamp}-${activity.userEmail}-${activity.action}-${activity.resource}-${index}`;
}

export function AdminAuditTui({ reportDeps, days = 30, onCancel }: AdminAuditTuiProps) {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

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

  const filteredActivities = filterItemsByQuery(
    activities,
    appliedSearch,
    (activity) => [activity.userEmail, activity.action, activity.resource],
  );

  const { slice: visibleActivities, hasNextPage } = sliceLocalPage(
    filteredActivities,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / DEFAULT_TUI_PAGE_SIZE));

  useInput((input, key) => {
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
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && hasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexShrink={0} marginBottom={1}>
        <Text bold color="cyan">
          Admin Audit (last {days} days)
          {!loading && filteredActivities.length > 0
            ? ` (${filteredActivities.length} total · page ${currentIndex + 1}/${totalPages})`
            : ''}
        </Text>
      </Box>

      <Box flexShrink={0}>
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
          hint="press / or s to edit · Enter to apply · ESC to cancel · filters all results"
        />
      </Box>

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {loading ? (
          <Text color="yellow">Loading admin audit...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : activities.length === 0 ? (
          <Text color="gray">No admin activities found.</Text>
        ) : filteredActivities.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No activities match "${appliedSearch}". Clear search to see all results.`
              : 'No admin activities found.'}
          </Text>
        ) : (
          visibleActivities.map((activity, index) => (
            <Box key={activityKey(activity, index)} marginBottom={1}>
              <Text wrap="wrap">
                <Text color="green" bold>{activity.userEmail || '(unknown)'}</Text>
                <Text color="gray">  </Text>
                <Text color="cyan">{activity.action || '(no action)'}</Text>
                <Text color="gray">  </Text>
                <Text>{activity.resource || '(no resource)'}</Text>
                <Text color="gray">  </Text>
                <Text color="gray">{activity.timestamp}</Text>
              </Text>
            </Box>
          ))
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={hasNextPage}
        loading={loading}
      />
    </Box>
  );
}