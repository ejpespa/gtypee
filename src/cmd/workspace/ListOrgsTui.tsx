import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE, sliceLocalPage } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { copyToClipboard } from '../tui/systemActions.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { OrgActionsTui } from './OrgActionsTui.js';
import type { WorkspaceOrgUnitCommandDeps, OrgUnit } from './commands.js';

export interface ListOrgsTuiProps {
  orgDeps: WorkspaceOrgUnitCommandDeps;
  onViewUsersInOrg?: (orgUnitPath: string) => void;
  onCancel?: () => void;
}

function formatOrgLabel(ou: OrgUnit): string {
  const name = ou.name?.trim();
  const description = ou.description?.trim();
  const path = ou.orgUnitPath || '(no path)';

  if (name && description && name !== description) {
    return `${path} — ${name} — ${description}`;
  }
  if (name) return `${path} — ${name}`;
  if (description) return `${path} — ${description}`;
  return path;
}

function resolveParentLabel(ou: OrgUnit, allOrgs: OrgUnit[]): string {
  if (!ou.parentOrgUnitId) return '(none)';
  const parent = allOrgs.find((item) => item.orgUnitId === ou.parentOrgUnitId);
  if (parent?.orgUnitPath) return parent.orgUnitPath;
  return ou.parentOrgUnitId;
}

export function ListOrgsTui({ orgDeps, onViewUsersInOrg, onCancel }: ListOrgsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<OrgUnit | null>(null);
  const [actionsOrgPath, setActionsOrgPath] = useState<string | null>(null);

  const detail = useDetailView();
  const actions = useDetailActions();

  const loadOrgUnits = useCallback(async () => {
    if (!orgDeps.listOrgUnits) {
      throw new Error('listOrgUnits dependency function is not provided.');
    }
    return orgDeps.listOrgUnits();
  }, [orgDeps]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    loadOrgUnits()
      .then((items) => {
        setOrgUnits(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to retrieve organizational units');
        setLoading(false);
      });
  }, [loadOrgUnits]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setCurrentIndex(0);
    setIsEditingSearch(false);
  }, [searchDraft]);

  useEffect(() => {
    setBreadcrumbs(['Workspace', 'Orgs']);
    setHelpLines([
      '/ or s — search',
      'r — refresh list',
      'Enter — view org unit',
      'c/u/a — actions in detail',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentIndex(0);

    loadOrgUnits()
      .then((items) => {
        if (!active) return;
        setOrgUnits(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve organizational units');
        setLoading(false);
      });

    return () => { active = false; };
  }, [loadOrgUnits]);

  const filteredOrgs = filterItemsByQuery(
    orgUnits,
    appliedSearch,
    (ou) => [ou.orgUnitPath ?? '', ou.name ?? '', ou.description ?? ''],
  );

  const { slice: visibleOrgs, hasNextPage } = sliceLocalPage(
    filteredOrgs,
    currentIndex,
    DEFAULT_TUI_PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / DEFAULT_TUI_PAGE_SIZE));

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setSelectedOrg(null);
  }, [actions, detail]);

  const openOrgActions = useCallback((orgUnitPath: string) => {
    clearDetail();
    setActionsOrgPath(orgUnitPath);
  }, [clearDetail]);

  const handleSelectOrg = useCallback(async (orgUnitId: string) => {
    const org = filteredOrgs.find((ou) => ou.orgUnitId === orgUnitId);
    if (!org) return;

    actions.resetStatus();
    setSelectedOrg(org);

    await detail.open({
      title: org.orgUnitPath || org.name || 'Org Unit',
      load: async () => [
        `Path: ${org.orgUnitPath || '(none)'}`,
        `Name: ${org.name?.trim() || '(none)'}`,
        `Parent: ${resolveParentLabel(org, orgUnits)}`,
        `Description: ${org.description?.trim() || '(none)'}`,
      ],
    });
  }, [actions, detail, filteredOrgs, orgUnits]);

  const detailPanelActions = useMemo((): TuiDetailAction[] => {
    if (!selectedOrg) return [];

    const orgUnitPath = selectedOrg.orgUnitPath || '';

    const panelActions: TuiDetailAction[] = [
      {
        key: 'c',
        label: 'copy path',
        onAction: () => actions.runAction(async () => {
          await copyToClipboard(orgUnitPath);
          return `Copied path: ${orgUnitPath}`;
        }),
      },
    ];

    if (onViewUsersInOrg && orgUnitPath) {
      panelActions.push({
        key: 'u',
        label: 'view users',
        onAction: () => actions.runAction(async () => {
          onViewUsersInOrg(orgUnitPath);
          clearDetail();
          return `Opening users in ${orgUnitPath}`;
        }),
      });
    }

    panelActions.push({
      key: 'a',
      label: 'org actions',
      onAction: () => actions.runAction(async () => {
        openOrgActions(orgUnitPath);
        return `Opening actions for ${orgUnitPath || selectedOrg.name}`;
      }),
    });

    return panelActions;
  }, [actions, clearDetail, onViewUsersInOrg, openOrgActions, selectedOrg]);

  const blocked = isEditingSearch || detail.isOpen || actionsOrgPath !== null;

  useInput((input, key) => {
    if (actionsOrgPath !== null || detail.isOpen) return;

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

  if (actionsOrgPath !== null) {
    return (
      <OrgActionsTui
        orgDeps={orgDeps}
        prefillOrgUnitPath={actionsOrgPath}
        onCancel={() => setActionsOrgPath(null)}
      />
    );
  }

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Org Unit'}
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

  const emptyMessage = orgUnits.length === 0
    ? 'No organizational units found.'
    : appliedSearch
      ? `No org units match "${appliedSearch}". Clear search to see all results.`
      : 'No organizational units found.';

  return (
    <TuiListScreen
      title="Organizational Units"
      pageLabel={`Page ${currentIndex + 1}/${totalPages}`}
      items={visibleOrgs}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectOrg}
      formatLabel={formatOrgLabel}
      getId={(ou) => ou.orgUnitId}
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
      onRefresh={refresh}
      blocked={blocked}
    />
  );
}