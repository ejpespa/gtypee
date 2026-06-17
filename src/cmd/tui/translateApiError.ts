import {
  isAuthRequiredError,
  isPermissionDeniedError,
  isQuotaExceededError,
  isRateLimitError,
} from '../../googleapi/errors.js';

export function translateApiError(error: unknown): string {
  if (isAuthRequiredError(error)) {
    return `${error.message}. Run: gtypee auth login`;
  }
  if (isQuotaExceededError(error)) return error.message;
  if (isRateLimitError(error)) return error.message;
  if (isPermissionDeniedError(error)) return error.message;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('invalid value')) {
    return 'Invalid Drive query. Try plain text (e.g. trip) or name contains \'report\'.';
  }
  if (lower.includes('403') || lower.includes('permission')) {
    return `Permission denied: ${message}`;
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return `Authentication failed: ${message}. Run: gtypee auth login`;
  }

  return message;
}