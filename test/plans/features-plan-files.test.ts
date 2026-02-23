import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredPlanFiles = [
  "docs/plans/features/README.md",
  "docs/plans/features/core-cli.md",
  "docs/plans/features/auth.md",
  "docs/plans/features/gmail.md",
  "docs/plans/features/calendar.md",
  "docs/plans/features/drive.md",
  "docs/plans/features/docs.md",
  "docs/plans/features/sheets.md",
  "docs/plans/features/slides.md",
  "docs/plans/features/chat.md",
  "docs/plans/features/classroom.md",
  "docs/plans/features/contacts.md",
  "docs/plans/features/people.md",
  "docs/plans/features/tasks.md",
  "docs/plans/features/forms.md",
  "docs/plans/features/keep.md",
  "docs/plans/features/groups.md",
  "docs/plans/features/appscript.md",
];

describe("feature plan pack", () => {
  it("contains all required feature plan files", () => {
    for (const filePath of requiredPlanFiles) {
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
