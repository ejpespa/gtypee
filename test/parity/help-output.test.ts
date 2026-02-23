import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildProgram } from "../../src/cmd/root.js";

function commandSummary(): string {
  const program = buildProgram();
  return program.commands
    .map((command) => `${command.name()}:${command.description()}`)
    .sort()
    .join("\n");
}

function parityCompleteFeatures(): string[] {
  const filePath = path.join(process.cwd(), "docs", "plans", "features", "README.md");
  const content = readFileSync(filePath, "utf8");
  const completed: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([a-z-]+)\s*\|\s*([a-z-]+)\s*\|/);
    if (match === null || match[2] !== "parity-complete") {
      continue;
    }

    const feature = match[1];
    if (feature !== undefined) {
      completed.push(feature);
    }
  }

  return completed.sort();
}

describe("help output parity", () => {
  it("matches top-level command summary snapshot", () => {
    expect(commandSummary()).toMatchInlineSnapshot(`
      "agent:Agent-friendly helpers
      appscript:Google Apps Script
      auth:Auth and credentials
      calendar:Google Calendar
      chat:Google Chat
      classroom:Google Classroom
      completion:Generate shell completion scripts
      config:Manage configuration
      contacts:Google Contacts
      docs:Google Docs (export via Drive)
      download:Download a Drive file (alias for 'drive download')
      drive:Google Drive
      exit-codes:Print stable exit codes
      forms:Google Forms
      gmail:Gmail
      groups:Google Groups
      keep:Google Keep (Workspace only)
      login:Authorize and store a refresh token (alias for 'auth add')
      logout:Remove a stored refresh token (alias for 'auth logout')
      ls:List Drive files (alias for 'drive ls')
      me:Show your profile (alias for 'people me')
      open:Print a best-effort web URL for a Google URL/ID
      people:Google People
      schema:Machine-readable command schema
      search:Search Drive files (alias for 'drive search')
      send:Send an email (alias for 'gmail send')
      sheets:Google Sheets
      slides:Google Slides
      status:Show auth/config status (alias for 'auth status')
      tasks:Google Tasks
      time:Local time utilities
      upload:Upload a file to Drive (alias for 'drive upload')
      version:Print version
      whoami:Show your profile (alias for 'people me')
      workspace:Google Workspace admin"
    `);
  });

  it("marks completed features as parity-complete", () => {
    expect(parityCompleteFeatures()).toEqual([
      "appscript",
      "auth",
      "calendar",
      "chat",
      "classroom",
      "contacts",
      "core-cli",
      "docs",
      "drive",
      "forms",
      "gmail",
      "groups",
      "keep",
      "people",
      "sheets",
      "slides",
      "tasks",
    ]);
  });
});
