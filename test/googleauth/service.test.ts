import { describe, expect, it } from "vitest";

import {
  DriveScopeMode,
  allServices,
  parseService,
  scopes,
  scopesForManage,
  scopesForManageWithOptions,
  userServiceCSV,
  userServices,
} from "../../src/googleauth/service.js";

describe("googleauth service catalog", () => {
  it("parses known service", () => {
    expect(parseService("GMAIL")).toBe("gmail");
  });

  it("throws on unknown service", () => {
    expect(() => parseService("unknown")).toThrow("unknown service");
  });

  it("returns user services and excludes keep/groups", () => {
    const names = userServices();
    expect(names).toContain("gmail");
    expect(names).not.toContain("keep");
    expect(names).not.toContain("groups");
  });

  it("returns sorted merged manage scopes including oidc", () => {
    const values = scopesForManage(["gmail", "drive"]);
    expect(values).toContain("openid");
    expect(values).toContain("email");
    expect(values).toContain("https://www.googleapis.com/auth/userinfo.email");
    expect(values).toContain("https://www.googleapis.com/auth/gmail.modify");
  });

  it("supports readonly + drive scope options", () => {
    const values = scopesForManageWithOptions(["docs"], {
      readonly: true,
      driveScope: DriveScopeMode.File,
    });

    expect(values).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(values).toContain("https://www.googleapis.com/auth/documents.readonly");
    expect(values).not.toContain("https://www.googleapis.com/auth/drive.file");
  });

  it("produces CSV for user services", () => {
    const csv = userServiceCSV();
    expect(csv).toContain("gmail");
    expect(csv).toContain(",");
  });

  it("exposes scopes for each known service", () => {
    for (const service of allServices()) {
      expect(scopes(service).length).toBeGreaterThan(0);
    }
  });

  it("groups scopes include admin.directory.group for Admin SDK directory_v1 API", () => {
    const groupScopes = scopes("groups");
    expect(groupScopes).toContain("https://www.googleapis.com/auth/admin.directory.group");
  });

  it("appscript scopes include drive scope for listing script files via Drive API", () => {
    const appscriptScopes = scopes("appscript");
    expect(appscriptScopes).toContain("https://www.googleapis.com/auth/drive");
  });
});
