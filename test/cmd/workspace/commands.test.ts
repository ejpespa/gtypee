import { describe, expect, it, vi } from "vitest";
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
      listUsers: async () => ({
        items: [
          { id: "u1", primaryEmail: "user@example.com", name: { givenName: "Test", familyName: "User" }, suspended: false, orgUnitPath: "/", isAdmin: false },
        ],
      }),
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

describe("workspace user list with pagination", () => {
  it("should pass pageSize option to listUsers", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      items: [{ id: "u1", primaryEmail: "user@example.com", name: { givenName: "Test", familyName: "User" }, suspended: false, orgUnitPath: "/", isAdmin: false }],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listUsers });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "user", "list", "--page-size", "50"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(listUsers.mock.calls[0]).toHaveLength(2);
    expect(listUsers.mock.calls[0][0]).toBeUndefined();
    expect(listUsers.mock.calls[0][1]).toEqual(expect.objectContaining({ pageSize: 50 }));
  });

  it("should pass pageToken option to listUsers", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      items: [],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listUsers });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "user", "list", "--page-token", "abc123"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(listUsers.mock.calls[0]).toHaveLength(2);
    expect(listUsers.mock.calls[0][0]).toBeUndefined();
    expect(listUsers.mock.calls[0][1]).toEqual(expect.objectContaining({ pageToken: "abc123" }));
  });

  it("should output nextPageToken in JSON mode", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      items: [{ id: "u1", primaryEmail: "user@example.com", name: { givenName: "Test", familyName: "User" }, suspended: false, orgUnitPath: "/", isAdmin: false }],
      nextPageToken: "users-next-token",
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listUsers });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "--json", "workspace", "user", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { nextPageToken?: string };
    expect(parsed.nextPageToken).toBe("users-next-token");
  });

  it("should display nextPageToken in text mode", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      items: [{ id: "u1", primaryEmail: "user@example.com", name: { givenName: "Test", familyName: "User" }, suspended: false, orgUnitPath: "/", isAdmin: false }],
      nextPageToken: "users-next-token",
    });
    const program = new Command();
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listUsers });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "user", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Next page token: users-next-token");
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
      listGroups: async () => ({
        items: [
          { id: "g1", email: "group@example.com", name: "Test Group" },
        ],
      }),
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

describe("workspace group list with pagination", () => {
  it("should pass pageSize option to listGroups", async () => {
    const listGroups = vi.fn().mockResolvedValue({
      items: [{ id: "g1", email: "group@example.com", name: "Test Group" }],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listGroups });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "group", "list", "--page-size", "30"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listGroups).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 30 }));
  });

  it("should pass pageToken option to listGroups", async () => {
    const listGroups = vi.fn().mockResolvedValue({
      items: [],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listGroups });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "group", "list", "--page-token", "xyz789"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listGroups).toHaveBeenCalledWith(expect.objectContaining({ pageToken: "xyz789" }));
  });

  it("should output nextPageToken in JSON mode", async () => {
    const listGroups = vi.fn().mockResolvedValue({
      items: [{ id: "g1", email: "group@example.com", name: "Test Group" }],
      nextPageToken: "groups-next-token",
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listGroups });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "--json", "workspace", "group", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { nextPageToken?: string };
    expect(parsed.nextPageToken).toBe("groups-next-token");
  });

  it("should display nextPageToken in text mode", async () => {
    const listGroups = vi.fn().mockResolvedValue({
      items: [{ id: "g1", email: "group@example.com", name: "Test Group" }],
      nextPageToken: "groups-next-token",
    });
    const program = new Command();
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listGroups });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "group", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Next page token: groups-next-token");
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
      listDevices: async () => ({
        items: [
          { deviceId: "d1", email: "user@example.com", modelName: "Chromebook", osVersion: "1.0", status: "ACTIVE", orgUnitPath: "/", lastSync: "2024-01-01" },
        ],
      }),
    });

    const stdout = await captureStdout(() => root.parseAsync(["node", "typee", "workspace", "device", "list"]));
    expect(stdout).toContain("d1");
    expect(stdout).toContain("Chromebook");
  });
});

describe("workspace device list with pagination", () => {
  it("should pass pageSize option to listDevices", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      items: [{ deviceId: "d1", email: "user@example.com", modelName: "Chromebook", osVersion: "1.0", status: "ACTIVE", orgUnitPath: "/", lastSync: "2024-01-01" }],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listDevices });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "device", "list", "--page-size", "100"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listDevices).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pageSize: 100 }));
  });

  it("should pass pageToken option to listDevices", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      items: [],
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listDevices });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "device", "list", "--page-token", "dev123"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(listDevices).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pageToken: "dev123" }));
  });

  it("should output nextPageToken in JSON mode", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      items: [{ deviceId: "d1", email: "user@example.com", modelName: "Chromebook", osVersion: "1.0", status: "ACTIVE", orgUnitPath: "/", lastSync: "2024-01-01" }],
      nextPageToken: "devices-next-token",
    });
    const program = new Command();
    program.option("--json");
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listDevices });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "--json", "workspace", "device", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    const parsed = JSON.parse(stdout) as { nextPageToken?: string };
    expect(parsed.nextPageToken).toBe("devices-next-token");
  });

  it("should display nextPageToken in text mode", async () => {
    const listDevices = vi.fn().mockResolvedValue({
      items: [{ deviceId: "d1", email: "user@example.com", modelName: "Chromebook", osVersion: "1.0", status: "ACTIVE", orgUnitPath: "/", lastSync: "2024-01-01" }],
      nextPageToken: "devices-next-token",
    });
    const program = new Command();
    const workspace = program.command("workspace");
    registerWorkspaceCommands(workspace, { listDevices });

    let stdout = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await program.parseAsync(["node", "test", "workspace", "device", "list"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Next page token: devices-next-token");
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
