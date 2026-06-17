export type ListFooterHintOptions = {
  detailEnabled?: boolean;
  backHint: string;
  loading: boolean;
};

export function buildListFooterHint(options: ListFooterHintOptions): string {
  const detailEnabled = options.detailEnabled ?? true;
  const enterHint = detailEnabled ? 'Enter view' : 'Enter — no detail';
  const loadingSuffix = options.loading ? ' | Loading...' : '';
  return `${enterHint} · ←/→ or Space · ${options.backHint}${loadingSuffix}`;
}