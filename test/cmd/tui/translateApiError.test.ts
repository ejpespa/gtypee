import { describe, expect, it } from 'vitest';
import { PermissionDeniedError, QuotaExceededError } from '../../../src/googleapi/errors.js';
import { translateApiError } from '../../../src/cmd/tui/translateApiError.js';

describe('translateApiError', () => {
  it('maps Invalid Value to Drive query hint', () => {
    expect(translateApiError(new Error('Invalid Value'))).toContain('Drive query');
  });

  it('passes through typed errors', () => {
    expect(translateApiError(new QuotaExceededError('drive'))).toContain('quota');
  });

  it('maps 403 permission strings', () => {
    expect(translateApiError(new Error('403 Forbidden')).toLowerCase()).toContain('permission');
  });
});