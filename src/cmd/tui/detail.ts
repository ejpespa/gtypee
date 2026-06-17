export function textToDetailLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function wrapDetailLine(line: string, maxWidth: number): string[] {
  if (maxWidth < 8) return [line];
  if (line.length <= maxWidth) return [line];

  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > maxWidth) {
    let breakAt = remaining.lastIndexOf(' ', maxWidth);
    if (breakAt <= 0) breakAt = maxWidth;
    parts.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

export function flattenDetailLines(lines: string[], maxWidth: number): string[] {
  const flattened: string[] = [];
  for (const line of lines) {
    flattened.push(...wrapDetailLine(line, maxWidth));
  }
  return flattened;
}