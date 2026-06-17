export const DEFAULT_TUI_PAGE_SIZE = 20;

/** Smaller page size for multi-line TUI rows (org units show path + metadata per item). */
export const ORG_UNITS_TUI_PAGE_SIZE = 5;

export function mergeNextPageToken(
  history: (string | undefined)[],
  currentIndex: number,
  nextPageToken: string | undefined,
): (string | undefined)[] {
  const next = [...history];
  if (nextPageToken !== undefined) {
    next[currentIndex + 1] = nextPageToken;
    return next;
  }
  if (next.length > currentIndex + 1) {
    next[currentIndex + 1] = undefined;
  }
  return next;
}

export function hasNextTokenPage(
  pageHistory: (string | undefined)[],
  currentIndex: number,
): boolean {
  return pageHistory[currentIndex + 1] !== undefined;
}

export function sliceLocalPage<T>(
  items: T[],
  pageIndex: number,
  pageSize: number = DEFAULT_TUI_PAGE_SIZE,
): { slice: T[]; hasNextPage: boolean } {
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  return {
    slice: items.slice(start, end),
    hasNextPage: end < items.length,
  };
}

export function shouldHandlePaginationKey(
  input: string,
  key: { leftArrow?: boolean; rightArrow?: boolean },
  blocked: boolean,
): "prev" | "next" | null {
  if (blocked) return null;
  if (key.rightArrow || input === " ") return "next";
  if (key.leftArrow) return "prev";
  return null;
}