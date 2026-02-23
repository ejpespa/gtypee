import { describe, expect, it } from "vitest";
import { Command } from "commander";

import { AuthRequiredError } from "../../../src/googleapi/errors.js";
import { formatDriveFiles, formatDriveFileInfo, registerDriveCommands } from "../../../src/cmd/drive/commands.js";

describe("drive command formatters", () => {
  it("formats drive files as json", () => {
    const out = formatDriveFiles(
      [
        { id: "f1", name: "Doc 1", mimeType: "application/pdf" },
        { id: "f2", name: "Sheet 1", mimeType: "application/vnd.google-apps.spreadsheet" },
      ],
      "json",
    );
    const parsed = JSON.parse(out) as { files: Array<{ id: string }> };
    expect(parsed.files).toHaveLength(2);
  });

  it("registers ls/search/download/upload subcommands", () => {
    const drive = new Command("drive");
    registerDriveCommands(drive);
    const names = drive.commands.map((cmd) => cmd.name());
    expect(names).toContain("ls");
    expect(names).toContain("search");
    expect(names).toContain("download");
    expect(names).toContain("upload");
    expect(names).toContain("delete");
    expect(names).toContain("copy");
    expect(names).toContain("move");
    expect(names).toContain("rename");
    expect(names).toContain("mkdir");
    expect(names).toContain("info");
  });

  it("prints stable message for non-downloaded files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      downloadFile: async (id) => ({ id, path: "", downloaded: false }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "download", "--id", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Download failed for f1");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });

  it("prints stable message for non-uploaded files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      uploadFile: async (path) => ({ id: "", name: path, uploaded: false }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "upload", "--path", "report.csv"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Upload failed for report.csv");
    expect(stdout).not.toContain("not implemented yet in TypeScript port");
  });

  it("maps generic drive API errors to stable messages", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      uploadFile: async () => {
        throw new Error("network down");
      },
    });

    await expect(root.parseAsync(["node", "typee", "drive", "upload", "--path", "report.csv"])).rejects.toThrow(
      "drive api request failed: network down",
    );
  });

  it("keeps typed drive errors stable", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      downloadFile: async () => {
        throw new AuthRequiredError("drive", "a@b.com", "team");
      },
    });

    await expect(root.parseAsync(["node", "typee", "drive", "download", "--id", "f1"])).rejects.toThrow(
      "auth required for drive a@b.com (client team)",
    );
  });

  it("formats drive file info as json", () => {
    const out = formatDriveFileInfo(
      {
        id: "f1",
        name: "Doc 1",
        mimeType: "application/pdf",
        size: "1024",
        createdTime: "2024-01-01T00:00:00Z",
        modifiedTime: "2024-01-02T00:00:00Z",
        parents: ["root"],
      },
      "json",
    );
    const parsed = JSON.parse(out) as { id: string; name: string };
    expect(parsed.id).toBe("f1");
    expect(parsed.name).toBe("Doc 1");
  });

  it("formats drive file info as human readable", () => {
    const out = formatDriveFileInfo(
      {
        id: "f1",
        name: "Doc 1",
        mimeType: "application/pdf",
      },
      "human",
    );
    expect(out).toContain("ID:");
    expect(out).toContain("f1");
    expect(out).toContain("Name:");
    expect(out).toContain("Doc 1");
  });

  it("prints stable message for deleted files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      deleteFile: async (id, permanent) => ({ id, deleted: true, permanent }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "delete", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Trashed f1");
  });

  it("prints stable message for permanent deleted files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      deleteFile: async (id, permanent) => ({ id, deleted: true, permanent }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "delete", "f1", "--permanent"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Permanently deleted f1");
  });

  it("prints stable message for copied files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      copyFile: async (id, name) => ({ id: "copy1", name, originalId: id, copied: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "copy", "f1", "--name", "Copy of Doc"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Copied f1 to Copy of Doc");
  });

  it("prints stable message for moved files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      moveFile: async (id, parentId) => ({ id, name: "Doc 1", parentId, moved: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "move", "f1", "--parent", "folder1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Moved Doc 1");
    expect(stdout).toContain("folder1");
  });

  it("prints stable message for renamed files", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      renameFile: async (id, name) => ({ id, name, renamed: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "rename", "f1", "--name", "New Name"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Renamed to New Name");
  });

  it("prints stable message for created folder", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      createFolder: async (name) => ({ id: "folder1", name, created: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "mkdir", "--name", "New Folder"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("Created folder New Folder");
  });

  it("prints stable message for file info", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      getFileInfo: async (id) => ({
        id,
        name: "Doc 1",
        mimeType: "application/pdf",
        size: "1024",
      }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "info", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("f1");
    expect(stdout).toContain("Doc 1");
    expect(stdout).toContain("application/pdf");
  });
});

describe("drive permission commands", () => {
  it("registers permission subcommands", () => {
    const drive = new Command("drive");
    registerDriveCommands(drive);
    const permCmd = drive.commands.find((cmd) => cmd.name() === "permission");
    expect(permCmd).toBeDefined();
    const subcmds = permCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("create");
    expect(subcmds).toContain("delete");
  });

  it("permission list lists permissions", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      listPermissions: async () => [{ id: "p1", type: "user", role: "reader", emailAddress: "user@example.com" }],
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "permission", "list", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("p1");
    expect(stdout).toContain("user@example.com");
  });

  it("permission create shares file", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      createPermission: async () => ({ id: "p1", fileId: "f1", applied: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync([
        "node", "typee", "drive", "permission", "create", "f1",
        "--email", "user@example.com", "--role", "reader"
      ]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("p1");
    expect(stdout).toContain("f1");
  });
});

describe("drive comment commands", () => {
  it("registers comment subcommands", () => {
    const drive = new Command("drive");
    registerDriveCommands(drive);
    const commentCmd = drive.commands.find((cmd) => cmd.name() === "comment");
    expect(commentCmd).toBeDefined();
    const subcmds = commentCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("create");
    expect(subcmds).toContain("delete");
  });

  it("comment list lists comments", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      listComments: async () => [{ id: "c1", content: "Great doc!", author: "user@example.com", createdTime: "2024-01-01" }],
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "comment", "list", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("c1");
    expect(stdout).toContain("Great doc!");
  });

  it("comment create adds comment", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      createComment: async () => ({ id: "c1", fileId: "f1", applied: true }),
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "comment", "create", "f1", "--content", "Nice!"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("c1");
    expect(stdout).toContain("f1");
  });
});

describe("drive revision commands", () => {
  it("registers revision subcommands", () => {
    const drive = new Command("drive");
    registerDriveCommands(drive);
    const revCmd = drive.commands.find((cmd) => cmd.name() === "revision");
    expect(revCmd).toBeDefined();
    const subcmds = revCmd!.commands.map((cmd) => cmd.name());
    expect(subcmds).toContain("list");
    expect(subcmds).toContain("get");
    expect(subcmds).toContain("delete");
  });

  it("revision list lists revisions", async () => {
    const root = new Command();
    const drive = root.command("drive");
    registerDriveCommands(drive, {
      listRevisions: async () => [{ id: "r1", modifiedTime: "2024-01-01", size: "1024", keepForever: false }],
    });

    let stdout = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await root.parseAsync(["node", "typee", "drive", "revision", "list", "f1"]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(stdout).toContain("r1");
    expect(stdout).toContain("2024-01-01");
  });
});
