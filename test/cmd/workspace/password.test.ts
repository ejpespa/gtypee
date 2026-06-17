import { describe, expect, it } from 'vitest';
import { DEFAULT_GENERATED_PASSWORD_LENGTH, generatePassword } from '../../../src/cmd/workspace/password.js';

describe('generatePassword', () => {
  it('defaults to 16 characters', () => {
    expect(DEFAULT_GENERATED_PASSWORD_LENGTH).toBe(16);
    const password = generatePassword();
    expect(password).toHaveLength(16);
  });

  it('respects custom length', () => {
    expect(generatePassword(12)).toHaveLength(12);
  });

  it('uses only allowed characters', () => {
    const allowed = /^[A-Za-z0-9]+$/;
    expect(generatePassword()).toMatch(allowed);
  });
});