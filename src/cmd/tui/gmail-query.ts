export function normalizeGmailFromFilter(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (/^(from|to|cc|bcc):/i.test(trimmed)) {
    return trimmed;
  }

  return `from:${trimmed}`;
}

export function buildGmailListQuery(baseQuery: string, fromFilter: string): string {
  const parts: string[] = [];
  const base = baseQuery.trim();
  if (base) parts.push(base);

  const fromClause = normalizeGmailFromFilter(fromFilter);
  if (fromClause) parts.push(fromClause);

  return parts.join(' ');
}