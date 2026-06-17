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

export type KeybarOptions = {
  detailEnabled?: boolean;
  refreshEnabled?: boolean;
  extraKeys?: string[];
};

export function buildKeybarLine(options: KeybarOptions): string {
  const detailEnabled = options.detailEnabled ?? true;
  const enter = detailEnabled ? 'Enter detail' : 'Enter — no detail';
  const refresh = options.refreshEnabled !== false ? ' · r refresh' : '';
  const extra = options.extraKeys?.length ? ` · ${options.extraKeys.join(' · ')}` : '';
  return `↑/↓ select · ${enter} · ←/→ page · ? help${refresh} · ESC back${extra}`;
}