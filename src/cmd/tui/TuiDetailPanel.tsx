import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { flattenDetailLines } from './detail.js';

export interface TuiDetailPanelProps {
  title: string;
  lines: string[];
  loading?: boolean;
  error?: string | null;
  onBack: () => void;
}

export function TuiDetailPanel({
  title,
  lines,
  loading = false,
  error = null,
  onBack,
}: TuiDetailPanelProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout.columns > 0 ? stdout.columns : 80;
  const terminalHeight = stdout.rows > 0 ? stdout.rows : 24;
  const contentWidth = Math.max(20, terminalWidth - 8);
  const maxVisibleLines = Math.max(4, terminalHeight - 8);

  const [scrollOffset, setScrollOffset] = useState(0);

  const flatLines = useMemo(
    () => flattenDetailLines(lines, contentWidth),
    [lines, contentWidth],
  );

  const maxScroll = Math.max(0, flatLines.length - maxVisibleLines);
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = flatLines.slice(clampedOffset, clampedOffset + maxVisibleLines);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (loading) return;

    if (key.upArrow) {
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset((o) => Math.min(maxScroll, o + 1));
      return;
    }
    if (key.pageUp) {
      setScrollOffset((o) => Math.max(0, o - maxVisibleLines));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((o) => Math.min(maxScroll, o + maxVisibleLines));
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} borderStyle="round" borderColor="magenta">
      <Box marginBottom={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>

      {loading && (
        <Text color="yellow">Loading...</Text>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {!loading && !error && flatLines.length === 0 && (
        <Text color="gray">No content.</Text>
      )}

      {!loading && !error && visibleLines.length > 0 && (
        <Box flexDirection="column" flexGrow={1}>
          {visibleLines.map((line, index) => (
            <Text key={`${clampedOffset}-${index}`}>{line || ' '}</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          {flatLines.length > maxVisibleLines
            ? `Lines ${clampedOffset + 1}-${Math.min(clampedOffset + maxVisibleLines, flatLines.length)} of ${flatLines.length} · `
            : ''}
          ↑/↓ scroll · ESC back
        </Text>
      </Box>
    </Box>
  );
}