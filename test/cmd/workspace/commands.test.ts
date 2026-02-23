import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { registerWorkspaceCommands } from "../../../src/cmd/workspace/commands.js";

function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    fn()
      .then(() => {
        process.stdout.write = originalWrite;
        resolve(stdout);
      })
      .catch((err) => {
        process.stdout.write = originalWrite;
        reject(err);
      });
  });
}

describe("workspace command registration", () => {
  it("registers all top-level subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const names = workspace.commands.map((cmd) => cmd.name());
    expect(names).toContain("user");
    expect(names).toContain("group");
    expect(names).toContain("org");
    expect(names).toContain("device");
    expect(names).toContain("report");
  });
});

describe("workspace user commands", () => {
  it("registers user subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const userCmd = workspace.commands.find((cmd) => cmd.name() === "user");
    expect(userCmd).toBeDefined();
    const subcmds = userCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("create");
    expect(subcmds).toContain("delete");
    expect(subcmds).toContain("suspend");
    expect(subcmds).toContain("unsuspend");
    expect(subcmds).toContain("reset-password");
    expect(subcmds).toContain("set-admin");
    expect(subcmds).toContain("set-org-unit");
    expect(subcmds).toContain("add-alias");
    expect(subcmds).toContain("list-aliases");
    expect(subcmds).toContain("delete-alias");
    expect(subcmds).toContain("set-photo");
    expect(subcmds).toContain("delete-photo");
    expect(subcmds).toContain("generate-backup-codes");
  });

  it("user list returns users", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      listUsers: async () => [
        { id: "u1", primaryEmail: "user@example.com", name: { givenName: "Test", familyName: "User" }, suspended: false, orgUnitPath: "/", isAdmin: false },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "user", "list"]));
    expect(stdout).toContain("user@example.com");
  });

  it("user create creates a user", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      createUser: async () => ({
        userId: "u1",
        primaryEmail: "new@example.com",
        password: "temp1234",
        applied: true,
      }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync([
        "node", "typee", "workspace", "user", "create",
        "--email", "new@example.com", "--first-name", "New", "--last-name", "User"
      ])
    );
    expect(stdout).toContain("User created: new@example.com");
    expect(stdout).toContain("Password:");
  });

  it("user delete requires force", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      deleteUser: async () => ({ email: "delete@example.com", applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "workspace", "user", "delete", "--email", "delete@example.com"])
    );
    expect(stdout).toContain("Use --force to confirm");
  });

  it("user delete with force deletes user", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      deleteUser: async () => ({ email: "delete@example.com", applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "workspace", "user", "delete", "--email", "delete@example.com", "--force"])
    );
    expect(stdout).toContain("User deleted: delete@example.com");
  });

  it("user suspend suspends user", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      suspendUser: async () => ({ email: "suspend@example.com", suspended: true, applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "workspace", "user", "suspend", "--email", "suspend@example.com"])
    );
    expect(stdout).toContain("User suspended: suspend@example.com");
  });

  it("user reset-password resets password", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      resetPassword: async () => ({ email: "reset@example.com", newPassword: "newpass123", applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "workspace", "user", "reset-password", "--email", "reset@example.com"])
    );
    expect(stdout).toContain("Password reset for: reset@example.com");
    expect(stdout).toContain("New password:");
  });
});

describe("workspace group commands", () => {
  it("registers group subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const groupCmd = workspace.commands.find((cmd) => cmd.name() === "group");
    expect(groupCmd).toBeDefined();
    const subcmds = groupCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("create");
    expect(subcmds).toContain("delete");
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("add-member");
    expect(subcmds).toContain("remove-member");
    expect(subcmds).toContain("list-members");
  });

  it("group list returns groups", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      listGroups: async () => [
        { id: "g1", email: "group@example.com", name: "Test Group" },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "group", "list"]));
    expect(stdout).toContain("group@example.com");
    expect(stdout).toContain("Test Group");
  });

  it("group create creates a group", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      createGroup: async () => ({ groupId: "g1", email: "newgroup@example.com", name: "New Group", applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync([
        "node", "typee", "workspace", "group", "create",
        "--email", "newgroup@example.com", "--name", "New Group"
      ])
    );
    expect(stdout).toContain("Group created: newgroup@example.com");
  });

  it("group add-member adds member", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      addGroupMember: async () => ({ groupEmail: "group@example.com", memberEmail: "member@example.com", role: "MEMBER", applied: true }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync([
        "node", "typee", "workspace", "group", "add-member",
        "--group", "group@example.com", "--email", "member@example.com"
      ])
    );
    expect(stdout).toContain("member@example.com");
    expect(stdout).toContain("group@example.com");
  });

  it("group list-members lists members", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      listGroupMembers: async () => [
        { email: "member@example.com", role: "MEMBER", status: "ACTIVE" },
      ],
    });

    const stdout = await captureStdout(() =>
      root.parseAsync(["node", "typee", "workspace", "group", "list-members", "--group", "group@example.com"])
    );
    expect(stdout).toContain("member@example.com");
  });
});

describe("workspace org commands", () => {
  it("registers org subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const orgCmd = workspace.commands.find((cmd) => cmd.name() === "org");
    expect(orgCmd).toBeDefined();
    const subcmds = orgCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("create");
    expect(subcmds).toContain("get");
    expect(subcmds).toContain("update");
    expect(subcmds).toContain("delete");
  });

  it("org list returns org units", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      listOrgUnits: async () => [
        { orgUnitId: "ou1", name: "Engineering", orgUnitPath: "/Engineering" },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "org", "list"]));
    expect(stdout).toContain("/Engineering");
  });

  it("org create creates org unit", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      createOrgUnit: async () => ({
        orgUnitId: "ou1",
        name: "NewOU",
        orgUnitPath: "/NewOU",
        applied: true,
      }),
    });

    const stdout = await captureStdout(() =>
      root.parseAsync([
        "node", "typee", "workspace", "org", "create",
        "--name", "NewOU", "--parent", "/"
      ])
    );
    expect(stdout).toContain("Org unit created: /NewOU");
  });
});

describe("workspace device commands", () => {
  it("registers device subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const deviceCmd = workspace.commands.find((cmd) => cmd.name() === "device");
    expect(deviceCmd).toBeDefined();
    const subcmds = deviceCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
  });

  it("device list returns devices", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      listDevices: async () => [
        { deviceId: "d1", email: "user@example.com", modelName: "Chromebook", osVersion: "1.0", status: "ACTIVE", orgUnitPath: "/", lastSync: "2024-01-01" },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "device", "list"]));
    expect(stdout).toContain("d1");
    expect(stdout).toContain("Chromebook");
  });
});

describe("workspace report commands", () => {
  it("registers report subcommands", () => {
    const workspace = new Command("workspace");
    registerWorkspaceCommands(workspace);

    const reportCmd = workspace.commands.find((cmd) => cmd.name() === "report");
    expect(reportCmd).toBeDefined();
    const subcmds = reportCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("logins");
    expect(subcmds).toContain("admin");
  });

  it("report logins returns login activities", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      getLoginAudit: async () => [
        { userEmail: "user@example.com", timestamp: "2024-01-01", ipAddress: "1.2.3.4", success: true },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "report", "logins"]));
    expect(stdout).toContain("user@example.com");
  });

  it("report admin returns admin activities", async () => {
    const root = new Command();
    const workspace = root.command("workspace");
    registerWorkspaceCommands(workspace, {
      getAdminAudit: async () => [
        { userEmail: "admin@example.com", timestamp: "2024-01-01", action: "CREATE_USER", resource: "users/123" },
      ],
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "report", "admin"]));
    expect(stdout).toContain("admin@example.com");
    expect(stdout).toContain("CREATE_USER");
  });
});
