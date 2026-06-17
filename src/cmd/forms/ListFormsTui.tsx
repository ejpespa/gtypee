import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import type { TuiDetailAction } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { googleFormUrl } from '../tui/resourceLinks.js';
import { usePaginatedList } from '../tui/hooks/usePaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatFormGet } from './commands.js';
import type { FormSummary, FormsCommandDeps } from './commands.js';

export interface ListFormsTuiProps {
  formsDeps: Required<FormsCommandDeps>;
  onCancel?: () => void;
}

function formatFormLabel(form: FormSummary): string {
  return form.title || form.id;
}

export function ListFormsTui({ formsDeps, onCancel }: ListFormsTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailFormId, setDetailFormId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToken: string | undefined) =>
      formsDeps.listForms({
        pageSize: DEFAULT_TUI_PAGE_SIZE,
        ...(pageToken !== undefined ? { pageToken } : {}),
      }),
    [formsDeps],
  );

  const {
    items: currentForms,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = usePaginatedList({
    fetchPage,
    queryKey: 'forms-list',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Forms', 'Forms']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view form + responses',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleForms = filterItemsByQuery(
    currentForms,
    appliedSearch,
    (form) => [form.title, form.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailFormId(null);
  }, [detail, actions]);

  const handleSelectForm = useCallback(async (id: string) => {
    const summary = visibleForms.find((f) => f.id === id);
    actions.resetStatus();
    setDetailFormId(id);

    await detail.open({
      title: summary?.title || 'Form',
      load: async () => {
        const form = await formsDeps.getForm(id);
        const responses = await formsDeps.listResponses(id);
        const lines = [
          formatFormGet(form, 'human'),
          '',
          `Responses: ${responses.length}`,
        ];
        if (responses.length > 0) {
          lines.push('', 'RESPONSE_ID\tSUBMITTED_AT');
          for (const response of responses) {
            lines.push(`${response.id}\t${response.submittedAt}`);
          }
        }
        return lines;
      },
    });
  }, [actions, detail, formsDeps, visibleForms]);

  const detailActions = useMemo((): TuiDetailAction[] => {
    if (!detailFormId || !detail.title) return [];

    return mergeDetailActions(actions.runAction, {
      resourceId: detailFormId,
      openUrl: googleFormUrl(detailFormId),
    });
  }, [actions.runAction, detail.title, detailFormId]);

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

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (input === '/' || input === 's') {
      setIsEditingSearch(true);
    }
  });

  if (detail.isOpen) {
    return (
      <TuiDetailPanel
        title={detail.title ?? 'Form'}
        lines={detail.lines}
        loading={detail.loading}
        error={detail.error}
        onBack={clearDetail}
        actions={detailActions}
        actionStatus={actions.actionStatus}
        actionBusy={actions.actionBusy}
      />
    );
  }

  const emptyMessage = visibleForms.length === 0 && currentForms.length > 0 && appliedSearch
    ? `No forms match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No forms found on this page.';

  return (
    <TuiListScreen
      title="Forms"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleForms}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectForm}
      formatLabel={formatFormLabel}
      getId={(form) => form.id}
      filterSlot={(
        <TuiSearchControls
          appliedSearch={appliedSearch}
          searchDraft={searchDraft}
          isEditing={isEditingSearch}
          onDraftChange={setSearchDraft}
          onSubmit={applySearch}
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