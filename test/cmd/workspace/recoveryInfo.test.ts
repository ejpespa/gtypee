import { describe, expect, it } from "vitest";

import { buildRecoveryInfoPatch } from "../../../src/cmd/workspace/recoveryInfo.js";

describe("buildRecoveryInfoPatch", () => {
  it("returns null when both values are empty", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "", recoveryPhone: "" })).toBeNull();
  });

  it("returns null when both values are whitespace only", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "   ", recoveryPhone: "  " })).toBeNull();
  });

  it("returns only the email when phone is blank", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "rec@example.com", recoveryPhone: "" }))
      .toEqual({ recoveryEmail: "rec@example.com" });
  });

  it("returns only the phone when email is blank", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "", recoveryPhone: "+15551234567" }))
      .toEqual({ recoveryPhone: "+15551234567" });
  });

  it("returns both fields when both are provided", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "rec@example.com", recoveryPhone: "+15551234567" }))
      .toEqual({ recoveryEmail: "rec@example.com", recoveryPhone: "+15551234567" });
  });

  it("trims surrounding whitespace from provided values", () => {
    expect(buildRecoveryInfoPatch({ recoveryEmail: "  rec@example.com ", recoveryPhone: " +15551234567 " }))
      .toEqual({ recoveryEmail: "rec@example.com", recoveryPhone: "+15551234567" });
  });
});
