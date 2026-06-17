import type { TuiDetailAction } from './TuiDetailPanel.js';
import { copyToClipboard, openInBrowser } from './systemActions.js';

export type DetailActionRunner = (action: () => Promise<string>) => void | Promise<void>;

export function mergeDetailActions(
  runAction: DetailActionRunner,
  options: {
    resourceId?: string;
    openUrl?: string;
    actions?: TuiDetailAction[];
  },
): TuiDetailAction[] {
  const merged: TuiDetailAction[] = [];

  if (options.openUrl) {
    merged.push({
      key: 'o',
      label: 'open in browser',
      onAction: () => runAction(async () => {
        await openInBrowser(options.openUrl!);
        return 'Opened in browser';
      }),
    });
  }

  if (options.resourceId) {
    merged.push({
      key: 'c',
      label: 'copy ID',
      onAction: () => runAction(async () => {
        await copyToClipboard(options.resourceId!);
        return `Copied ID: ${options.resourceId}`;
      }),
    });
  }

  if (options.actions) {
    merged.push(...options.actions);
  }

  return merged;
}