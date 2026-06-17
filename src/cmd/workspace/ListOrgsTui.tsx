import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  ORG_UNITS_TUI_PAGE_SIZE,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiListFooter } from '../tui/TuiListFooter.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import type { WorkspaceOrgUnitCommandDeps, OrgUnit } from './commands.js';

export interface ListOrgsTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onCancel?: () => void;
}

function orgUnitDetailLine(ou: OrgUnit): string | null {
  const name = ou.name?.trim();
  const description = ou.description?.trim();
  if (name && description && name !== description) {
    return `${name} — ${description}`;
  }
  if (name) return name;
  if (description) return description;
  return null;
}

export function ListOrgsTui({ orgDeps, onCancel }: ListOrgsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!orgDeps.listOrgUnits) {
      throw new Error('listOrgUnits dependency function is not provided.');
    }
    return orgDeps.listOrgUnits();
  }, [orgDeps]);

  const {
    items: currentViewOrgs,
    allItems: orgUnits,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: 'workspace-orgs',
    pageSize: ORG_UNITS_TUI_PAGE_SIZE,
  });

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Organizational Units']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleOrgs = filterItemsByQuery(
    currentViewOrgs,
    appliedSearch,
    (ou) => [ou.orgUnitPath ?? '', ou.name ?? '', ou.description ?? ''],
  );

  const totalPages = Math.max(1, Math.ceil(orgUnits.length / ORG_UNITS_TUI_PAGE_SIZE));

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

    if (input === 'r') {
      refresh();
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
          Organizational Units
          {!loading && orgUnits.length > 0
            ? ` (${orgUnits.length} total · page ${currentIndex + 1}/${totalPages})`
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
          hint="press / or s to edit · Enter to apply · ESC to cancel · filters current page"
        />
      </Box>

      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {loading ? (
          <Text color="yellow">Loading organizational units...</Text>
        ) : error ? (
          <Text color="red">Error: {error}</Text>
        ) : orgUnits.length === 0 ? (
          <Text color="gray">No organizational units found.</Text>
        ) : currentViewOrgs.length === 0 ? (
          <Text color="gray">No organizational units on this page.</Text>
        ) : visibleOrgs.length === 0 ? (
          <Text color="gray">
            {appliedSearch
              ? `No org units match "${appliedSearch}" on this page. Try Next → or clear search.`
              : 'No organizational units on this page.'}
          </Text>
        ) : (
          visibleOrgs.map((ou) => {
            const detail = orgUnitDetailLine(ou);
            return (
              <Box key={ou.orgUnitId} flexDirection="column" marginBottom={1}>
                <Text wrap="wrap">
                  <Text color="green" bold>{ou.orgUnitPath || '(no path)'}</Text>
                </Text>
                {detail ? (
                  <Text color="gray" wrap="wrap">{detail}</Text>
                ) : null}
              </Box>
            );
          })
        )}
      </Box>

      <TuiListFooter
        currentIndex={currentIndex}
        hasNextPage={hasNextPage}
        loading={loading}
        backHint="r refresh · ESC to return"
      />
    </Box>
  );
}