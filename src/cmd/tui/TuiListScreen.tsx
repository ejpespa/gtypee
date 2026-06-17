import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { shouldHandlePaginationKey } from './pagination.js';
import { TuiListFooter } from './TuiListFooter.js';

export type TuiListScreenProps<T> = {
  title: string;
  pageLabel: string;
  items: T[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  currentIndex: number;
  onSelect: (id: string) => void;
  formatLabel: (item: T) => string;
  getId: (item: T) => string;
  filterSlot?: React.ReactNode;
  headerSlot?: React.ReactNode;
  emptyMessage?: string;
  onPagination: (action: 'prev' | 'next') => void;
  onRefresh?: () => void;
  blocked?: boolean;
};

export function TuiListScreen<T>({
  title,
  pageLabel,
  items,
  loading,
  error,
  hasNextPage,
  currentIndex,
  onSelect,
  formatLabel,
  getId,
  filterSlot,
  headerSlot,
  emptyMessage = 'No items found on this page.',
  onPagination,
  onRefresh,
  blocked = false,
}: TuiListScreenProps<T>) {
  useInput((input, key) => {
    if (blocked) return;
    if (input === 'r' && onRefresh) {
      onRefresh();
      return;
    }
    if (loading) return;
    const action = shouldHandlePaginationKey(input, key, false);
    if (action === 'next' && hasNextPage) onPagination('next');
    if (action === 'prev' && currentIndex > 0) onPagination('prev');
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          {title} ({pageLabel})
        </Text>
        {headerSlot}
      </Box>

      {filterSlot}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading && items.length === 0 ? (
        <Text color="yellow">Loading...</Text>
      ) : items.length === 0 ? (
        <Text color="gray">{emptyMessage}</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1} flexGrow={1}>
          <SelectInput
            items={items.map((item) => ({
              label: formatLabel(item),
              value: getId(item),
            }))}
            onSelect={(selected) => onSelect(selected.value)}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <TuiListFooter
          currentIndex={currentIndex}
          hasNextPage={hasNextPage}
          loading={loading}
          backHint={onRefresh ? 'r refresh · ESC to return' : 'ESC to return'}
        />
      </Box>
    </Box>
  );
}