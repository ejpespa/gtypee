import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInput } from 'ink';
import { DEFAULT_TUI_PAGE_SIZE } from '../tui/pagination.js';
import { filterItemsByQuery } from '../tui/search.js';
import { TuiSearchControls } from '../tui/TuiSearchControls.js';
import { TuiDetailPanel } from '../tui/TuiDetailPanel.js';
import { TuiListScreen } from '../tui/TuiListScreen.js';
import { mergeDetailActions } from '../tui/detailActions.js';
import { useLocalPaginatedList } from '../tui/hooks/useLocalPaginatedList.js';
import { useDetailView } from '../tui/hooks/useDetailView.js';
import { useDetailActions } from '../tui/hooks/useDetailActions.js';
import { useTuiNavigation } from '../tui/TuiNavigationContext.js';
import { formatClassroomCourses } from './commands.js';
import type { ClassroomCommandDeps, ClassroomCourse } from './commands.js';

export interface ListClassroomTuiProps {
  classroomDeps: Required<ClassroomCommandDeps>;
  onCancel?: () => void;
}

function formatCourseLabel(course: ClassroomCourse): string {
  return course.name || course.id;
}

export function ListClassroomTui({ classroomDeps, onCancel }: ListClassroomTuiProps) {
  const { setBreadcrumbs, setHelpLines } = useTuiNavigation();

  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    await classroomDeps.ensureWorkspace();
    return classroomDeps.listCourses();
  }, [classroomDeps]);

  const {
    items: currentCourses,
    currentIndex,
    setCurrentIndex,
    hasNextPage,
    loading,
    error,
    refresh,
  } = useLocalPaginatedList({
    fetchAll,
    queryKey: 'classroom-courses',
  });

  const detail = useDetailView();
  const actions = useDetailActions();

  useEffect(() => {
    setBreadcrumbs(['Classroom', 'Courses']);
    setHelpLines([
      '/ or s — filter current page',
      'r — refresh list',
      'Enter — view course',
      '←/→ or Space — paginate',
      'ESC — back',
    ]);
  }, [setBreadcrumbs, setHelpLines]);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setIsEditingSearch(false);
  }, [searchDraft]);

  const visibleCourses = filterItemsByQuery(
    currentCourses,
    appliedSearch,
    (course) => [course.name, course.id],
  );

  const clearDetail = useCallback(() => {
    detail.clear();
    actions.resetStatus();
    setDetailCourseId(null);
  }, [detail, actions]);

  const handleSelectCourse = useCallback(async (id: string) => {
    const summary = visibleCourses.find((c) => c.id === id);
    actions.resetStatus();
    setDetailCourseId(id);

    await detail.open({
      title: summary?.name || 'Course',
      load: async () => {
        await classroomDeps.ensureWorkspace();
        const course = await classroomDeps.getCourse(id);
        return formatClassroomCourses([course], 'human').split('\n');
      },
    });
  }, [actions, classroomDeps, detail, visibleCourses]);

  const detailActions = useMemo(() => {
    if (!detailCourseId) return [];
    return mergeDetailActions(actions.runAction, {
      resourceId: detailCourseId,
    });
  }, [actions.runAction, detailCourseId]);

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
        title={detail.title ?? 'Course'}
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

  const emptyMessage = visibleCourses.length === 0 && currentCourses.length > 0 && appliedSearch
    ? `No courses match "${appliedSearch}" on this page. Try Next → or clear search.`
    : 'No courses found.';

  return (
    <TuiListScreen
      title="Classroom"
      pageLabel={`Page ${currentIndex + 1}`}
      items={visibleCourses}
      loading={loading}
      error={error}
      hasNextPage={hasNextPage}
      currentIndex={currentIndex}
      onSelect={handleSelectCourse}
      formatLabel={formatCourseLabel}
      getId={(course) => course.id}
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