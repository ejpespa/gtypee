export type RecoveryInfoInput = {
  recoveryEmail?: string;
  recoveryPhone?: string;
};

/**
 * Builds the users.update request body for recovery info.
 * Blank values mean "keep current" and are omitted. Returns null when
 * nothing changed so callers can skip the API call entirely.
 */
export function buildRecoveryInfoPatch(
  input: RecoveryInfoInput,
): { recoveryEmail: string } | { recoveryPhone: string } | { recoveryEmail: string; recoveryPhone: string } | null {
  const recoveryEmail = input.recoveryEmail?.trim() ?? "";
  const recoveryPhone = input.recoveryPhone?.trim() ?? "";

  const patch: { recoveryEmail?: string; recoveryPhone?: string } = {};
  if (recoveryEmail) patch.recoveryEmail = recoveryEmail;
  if (recoveryPhone) patch.recoveryPhone = recoveryPhone;

  if (!patch.recoveryEmail && !patch.recoveryPhone) return null;
  return patch as { recoveryEmail: string } | { recoveryPhone: string } | { recoveryEmail: string; recoveryPhone: string };
}
