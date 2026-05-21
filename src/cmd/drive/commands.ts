import type { Command } from "commander";

import type { OutputMode } from "../../outfmt/outfmt.js";
import { resolveDriveDownloadPath, normalizeDriveSearchQuery } from "../../googleapi/drive.js";
import { toCliApiErrorMessage } from "../../googleapi/errors.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import type { PaginatedResult, PaginationOptions } from "../../types/pagination.js";

export type DriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
};

export type DriveFileInfo = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
};

export type DriveDeleteResult = {
  id: string;
  deleted: boolean;
  permanent: boolean;
};

export type DriveCopyResult = {
  id: string;
  name: string;
  originalId: string;
  copied: boolean;
};

export type DriveMoveResult = {
  id: string;
  name: string;
  parentId: string;
  moved: boolean;
};

export type DriveRenameResult = {
  id: string;
  name: string;
  renamed: boolean;
};

export type DriveMkdirResult = {
  id: string;
  name: string;
  created: boolean;
};

export type DriveExportResult = {
  id: string;
  name: string;
  path: string;
  exported: boolean;
};

// Permissions
export type DrivePermission = {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
};

export type DrivePermissionResult = {
  id: string;
  fileId: string;
  applied: boolean;
};

// Comments
export type DriveComment = {
  id: string;
  content: string;
  author: string;
  createdTime: string;
};

export type DriveCommentResult = {
  id: string;
  fileId: string;
  applied: boolean;
};

// Revisions
export type DriveRevision = {
  id: string;
  modifiedTime: string;
  size?: string;
  keepForever: boolean;
};

export type DriveCommandDeps = {
  listFiles?: (options?: PaginationOptions) => Promise<PaginatedResult<DriveFileSummary>>;
  searchFiles?: (query: string, options?: PaginationOptions) => Promise<PaginatedResult<DriveFileSummary>>;
  downloadFile?: (id: string, out?: string) => Promise<{ id: string; path: string; downloaded: boolean }>;
  uploadFile?: (path: string) => Promise<{ id: string; name: string; uploaded: boolean }>;
  deleteFile?: (id: string, permanent: boolean) => Promise<DriveDeleteResult>;
  copyFile?: (id: string, name: string, parentId?: string) => Promise<DriveCopyResult>;
  moveFile?: (id: string, parentId: string) => Promise<DriveMoveResult>;
  renameFile?: (id: string, name: string) => Promise<DriveRenameResult>;
  createFolder?: (name: string, parentId?: string) => Promise<DriveMkdirResult>;
  getFileInfo?: (id: string) => Promise<DriveFileInfo>;
  exportFile?: (id: string, format: string, out?: string) => Promise<DriveExportResult>;
  // Permission operations
  listPermissions?: (fileId: string) => Promise<DrivePermission[]>;
  createPermission?: (fileId: string, email: string, role: string, type: string) => Promise<DrivePermissionResult>;
  deletePermission?: (fileId: string, permissionId: string) => Promise<DrivePermissionResult>;
  // Comment operations
  listComments?: (fileId: string) => Promise<DriveComment[]>;
  createComment?: (fileId: string, content: string) => Promise<DriveCommentResult>;
  deleteComment?: (fileId: string, commentId: string) => Promise<DriveCommentResult>;
  // Revision operations
  listRevisions?: (fileId: string) => Promise<DriveRevision[]>;
  getRevision?: (fileId: string, revisionId: string) => Promise<DriveRevision>;
  deleteRevision?: (fileId: string, revisionId: string) => Promise<{ id: string; fileId: string; applied: boolean }>;
};

const defaultDeps: Required<DriveCommandDeps> = {
  listFiles: async () => ({ items: [] }),
  searchFiles: async () => ({ items: [] }),
  downloadFile: async (id, out) => ({ id, path: out ?? "", downloaded: false }),
  uploadFile: async (path) => ({ id: "", name: path, uploaded: false }),
  deleteFile: async (id, permanent) => ({ id, deleted: false, permanent }),
  copyFile: async (id, name, parentId) => ({ id: "", name, originalId: id, copied: false }),
  moveFile: async (id, parentId) => ({ id, name: "", parentId, moved: false }),
  renameFile: async (id, name) => ({ id, name, renamed: false }),
  createFolder: async (name, parentId) => ({ id: "", name, created: false }),
  getFileInfo: async (id) => ({ id, name: "", mimeType: "" }),
  exportFile: async (id, _format, out) => ({ id, name: "", path: out ?? "", exported: false }),
  // Permission defaults
  listPermissions: async () => [],
  createPermission: async (fileId) => ({ id: "", fileId, applied: false }),
  deletePermission: async (fileId, permissionId) => ({ id: permissionId, fileId, applied: false }),
  // Comment defaults
  listComments: async () => [],
  createComment: async (fileId) => ({ id: "", fileId, applied: false }),
  deleteComment: async (fileId, commentId) => ({ id: commentId, fileId, applied: false }),
  // Revision defaults
  listRevisions: async () => [],
  getRevision: async (_fileId, revisionId) => ({ id: revisionId, modifiedTime: "", keepForever: false }),
  deleteRevision: async (fileId, revisionId) => ({ id: revisionId, fileId, applied: false }),
};

// Quota types
export type DriveQuota = {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInTrash: string;
};

export type DriveQuotaDeps = {
  getQuota?: () => Promise<DriveQuota>;
};

const defaultQuotaDeps: Required<DriveQuotaDeps> = {
  getQuota: async () => ({ limit: "0", usage: "0", usageInDrive: "0", usageInTrash: "0" }),
};

// Trash types
export type DriveTrashRestoreResult = {
  id: string;
  restored: boolean;
};

export type DriveTrashDeps = {
  listTrash?: (options?: PaginationOptions) => Promise<PaginatedResult<DriveFileSummary>>;
  emptyTrash?: () => Promise<{ emptied: boolean }>;
  restoreFromTrash?: (fileId: string) => Promise<DriveTrashRestoreResult>;
};

const defaultTrashDeps: Required<DriveTrashDeps> = {
  listTrash: async () => ({ items: [] }),
  emptyTrash: async () => ({ emptied: false }),
  restoreFromTrash: async () => ({ id: "", restored: false }),
};

// Shared drives types
export type SharedDriveSummary = {
  id: string;
  name: string;
};

export type DriveSharedDrivesDeps = {
  listSharedDrives?: (options?: PaginationOptions) => Promise<{ items: SharedDriveSummary[]; nextPageToken?: string }>;
  getSharedDrive?: (driveId: string) => Promise<SharedDriveSummary>;
  createSharedDrive?: (name: string) => Promise<{ id: string; created: boolean }>;
  deleteSharedDrive?: (driveId: string) => Promise<{ id: string; deleted: boolean }>;
};

const defaultSharedDrivesDeps: Required<DriveSharedDrivesDeps> = {
  listSharedDrives: async () => ({ items: [] }),
  getSharedDrive: async () => ({ id: "", name: "" }),
  createSharedDrive: async () => ({ id: "", created: false }),
  deleteSharedDrive: async () => ({ id: "", deleted: false }),
};

async function runWithStableApiError<T>(service: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: unknown) {
    throw new Error(toCliApiErrorMessage(service, error), { cause: error });
  }
}

export function formatDriveFiles(result: PaginatedResult<DriveFileSummary>, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  if (result.items.length === 0) {
    return "No files found";
  }
  const lines = ["ID\tNAME\tMIME"];
  for (const file of result.items) {
    lines.push(`${file.id}\t${file.name}\t${file.mimeType}`);
  }
  if (result.nextPageToken) {
    lines.push("---");
    lines.push(`Next page token: ${result.nextPageToken}`);
  }
  return lines.join("\n");
}

export function formatDriveFileInfo(file: DriveFileInfo, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(file, null, 2);
  }
  const lines = [
    `ID:           ${file.id}`,
    `Name:         ${file.name}`,
    `MIME Type:    ${file.mimeType}`,
  ];
  if (file.size !== undefined) {
    lines.push(`Size:         ${file.size}`);
  }
  if (file.createdTime !== undefined) {
    lines.push(`Created:      ${file.createdTime}`);
  }
  if (file.modifiedTime !== undefined) {
    lines.push(`Modified:     ${file.modifiedTime}`);
  }
  if (file.parents !== undefined && file.parents.length > 0) {
    lines.push(`Parents:      ${file.parents.join(", ")}`);
  }
  return lines.join("\n");
}

export function formatDrivePermissions(permissions: DrivePermission[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ permissions }, null, 2);
  }
  if (permissions.length === 0) {
    return "No permissions found";
  }
  const lines = ["ID\tTYPE\tROLE\tEMAIL"];
  for (const perm of permissions) {
    lines.push(`${perm.id}\t${perm.type}\t${perm.role}\t${perm.emailAddress ?? "-"}`);
  }
  return lines.join("\n");
}

export function formatDriveComments(comments: DriveComment[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ comments }, null, 2);
  }
  if (comments.length === 0) {
    return "No comments found";
  }
  const lines: string[] = [];
  for (const comment of comments) {
    lines.push(`ID: ${comment.id}`);
    lines.push(`Author: ${comment.author}`);
    lines.push(`Created: ${comment.createdTime}`);
    lines.push(`Content: ${comment.content}`);
    lines.push("---");
  }
  return lines.join("\n");
}

export function formatDriveRevisions(revisions: DriveRevision[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ revisions }, null, 2);
  }
  if (revisions.length === 0) {
    return "No revisions found";
  }
  const lines = ["ID\tMODIFIED\tSIZE\tKEEP"];
  for (const rev of revisions) {
    lines.push(`${rev.id}\t${rev.modifiedTime}\t${rev.size ?? "-"}\t${rev.keepForever ? "yes" : "no"}`);
  }
  return lines.join("\n");
}

export function formatDriveRevision(revision: DriveRevision, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(revision, null, 2);
  }
  const lines = [
    `ID:           ${revision.id}`,
    `Modified:     ${revision.modifiedTime}`,
    `Keep Forever: ${revision.keepForever ? "yes" : "no"}`,
  ];
  if (revision.size !== undefined) {
    lines.push(`Size:         ${revision.size}`);
  }
  return lines.join("\n");
}

const FORMAT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  html: "text/html",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  epub: "application/epub+zip",
};

export function resolveDriveExportMime(format: string): string {
  const mime = FORMAT_TO_MIME[format.toLowerCase()];
  if (!mime) {
    throw new Error(
      `Unsupported export format: '${format}'. Supported: ${Object.keys(FORMAT_TO_MIME).join(", ")}`,
    );
  }
  return mime;
}

export function formatDriveExportResult(result: DriveExportResult, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(result, null, 2);
  }
  return result.exported
    ? `Exported ${result.name} (id=${result.id}) to ${result.path}`
    : `Export failed for ${result.id}`;
}

function formatBytes(bytes: string): string {
  const b = Number(bytes);
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export function formatDriveQuota(quota: DriveQuota, mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify(quota, null, 2);
  }
  return [
    `Limit: ${formatBytes(quota.limit)}`,
    `Usage: ${formatBytes(quota.usage)}`,
    `In Drive: ${formatBytes(quota.usageInDrive)}`,
    `In Trash: ${formatBytes(quota.usageInTrash)}`,
  ].join("\n");
}

export function formatSharedDrives(drives: SharedDriveSummary[], mode: OutputMode): string {
  if (mode === "json") {
    return JSON.stringify({ drives }, null, 2);
  }
  if (drives.length === 0) return "No shared drives";
  const lines = ["ID\tNAME"];
  for (const d of drives) {
    lines.push(`${d.id}\t${d.name}`);
  }
  return lines.join("\n");
}

export function registerDriveCommands(driveCommand: Command, deps: DriveCommandDeps & DriveQuotaDeps & DriveTrashDeps & DriveSharedDrivesDeps = {}): void {
  const resolvedDeps: Required<DriveCommandDeps> = {
    ...defaultDeps,
    ...deps,
  };
  const quotaDeps: Required<DriveQuotaDeps> = { ...defaultQuotaDeps, ...deps };
  const trashDeps: Required<DriveTrashDeps> = { ...defaultTrashDeps, ...deps };
  const sharedDrivesDeps: Required<DriveSharedDrivesDeps> = { ...defaultSharedDrivesDeps, ...deps };

  driveCommand
    .command("ls")
    .aliases(["list"])
    .description("List drive files")
    .option("--page-size <number>", "Number of files per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionLs(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: number; pageToken?: string }>();
      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
      const result = await runWithStableApiError("drive", () =>
        resolvedDeps.listFiles(paginationOpts)
      );
      process.stdout.write(`${formatDriveFiles(result, ctx.output.mode)}\n`);
    });

  driveCommand
    .command("search")
    .aliases(["find"])
    .description("Search drive files")
    .requiredOption("--query <query>", "Drive search query")
    .option("--page-size <number>", "Number of files per page", parseInt)
    .option("--page-token <token>", "Token for the next page")
    .action(async function actionSearch(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ query: string; pageSize?: number; pageToken?: string }>();
      const paginationOpts: import("../../types/pagination.js").PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
      const result = await runWithStableApiError("drive", () =>
        resolvedDeps.searchFiles(normalizeDriveSearchQuery(opts.query), paginationOpts)
      );
      process.stdout.write(`${formatDriveFiles(result, ctx.output.mode)}\n`);
    });

  driveCommand
    .command("download")
    .aliases(["dl"])
    .description("Download file")
    .requiredOption("--id <id>", "Drive file id")
    .option("--out <path>", "Output path")
    .action(async function actionDownload(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string; out?: string }>();
      const outputPath = resolveDriveDownloadPath(opts.id, opts.out);
      const result = await runWithStableApiError("drive", () => resolvedDeps.downloadFile(opts.id, outputPath));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.downloaded ? `Downloaded ${result.id} to ${result.path}\n` : `Download failed for ${result.id}\n`);
    });

  driveCommand
    .command("upload")
    .aliases(["up", "put"])
    .description("Upload file")
    .requiredOption("--path <path>", "Local file path")
    .action(async function actionUpload(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ path: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.uploadFile(opts.path));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.uploaded ? `Uploaded ${opts.path} (id=${result.id || "unknown"})\n` : `Upload failed for ${opts.path}\n`);
    });

  driveCommand
    .command("delete")
    .aliases(["rm", "trash"])
    .description("Delete or trash a file")
    .argument("<file-id>", "Drive file id")
    .option("--permanent", "Permanently delete (bypass trash)", false)
    .action(async function actionDelete(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ permanent: boolean }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.deleteFile(fileId, opts.permanent));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      if (result.deleted) {
        const action = opts.permanent ? "Permanently deleted" : "Trashed";
        process.stdout.write(`${action} ${result.id}\n`);
      } else {
        process.stdout.write(`Delete failed for ${result.id}\n`);
      }
    });

  driveCommand
    .command("copy")
    .aliases(["cp"])
    .description("Copy a file")
    .argument("<file-id>", "Drive file id to copy")
    .requiredOption("--name <name>", "Name for the copied file")
    .option("--parent <folder-id>", "Parent folder id for the copy")
    .action(async function actionCopy(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string; parent?: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.copyFile(fileId, opts.name, opts.parent));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.copied ? `Copied ${result.originalId} to ${result.name} (id=${result.id})\n` : `Copy failed for ${result.originalId}\n`);
    });

  driveCommand
    .command("move")
    .aliases(["mv"])
    .description("Move file to different folder")
    .argument("<file-id>", "Drive file id to move")
    .requiredOption("--parent <folder-id>", "Destination folder id")
    .action(async function actionMove(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ parent: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.moveFile(fileId, opts.parent));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.moved ? `Moved ${result.name} (id=${result.id}) to folder ${result.parentId}\n` : `Move failed for ${result.id}\n`);
    });

  driveCommand
    .command("rename")
    .description("Rename a file")
    .argument("<file-id>", "Drive file id to rename")
    .requiredOption("--name <name>", "New name for the file")
    .action(async function actionRename(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.renameFile(fileId, opts.name));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.renamed ? `Renamed to ${result.name} (id=${result.id})\n` : `Rename failed for ${result.id}\n`);
    });

  driveCommand
    .command("mkdir")
    .aliases(["create-folder"])
    .description("Create a folder")
    .requiredOption("--name <name>", "Folder name")
    .option("--parent <folder-id>", "Parent folder id")
    .action(async function actionMkdir(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string; parent?: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.createFolder(opts.name, opts.parent));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.created ? `Created folder ${result.name} (id=${result.id})\n` : `Failed to create folder ${result.name}\n`);
    });

  driveCommand
    .command("info")
    .aliases(["stat", "get"])
    .description("Get detailed file info")
    .argument("<file-id>", "Drive file id")
    .action(async function actionInfo(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("drive", () => resolvedDeps.getFileInfo(fileId));
      process.stdout.write(`${formatDriveFileInfo(result, ctx.output.mode)}\n`);
    });

  driveCommand
    .command("export")
    .description("Export a Google Workspace file to a local format (Docs, Sheets, Slides)")
    .argument("<file-id>", "Drive file id (must be a Google Workspace file)")
    .requiredOption("--format <fmt>", "Export format: pdf, docx, xlsx, pptx, csv, txt, html, odt, ods, odp, rtf, epub")
    .option("--out <path>", "Output file path (default: derived from filename + format)")
    .action(async function actionExport(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ format: string; out?: string }>();
      const result = await runWithStableApiError("drive", () =>
        resolvedDeps.exportFile(fileId, opts.format, opts.out),
      );
      process.stdout.write(`${formatDriveExportResult(result, ctx.output.mode)}\n`);
    });

  // Permission commands
  const permissionCmd = driveCommand.command("permission").description("File permission management");

  permissionCmd
    .command("list")
    .aliases(["ls"])
    .description("List who has access to a file")
    .argument("<file-id>", "Drive file id")
    .action(async function actionListPermissions(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const permissions = await runWithStableApiError("drive", () => resolvedDeps.listPermissions(fileId));
      process.stdout.write(`${formatDrivePermissions(permissions, ctx.output.mode)}\n`);
    });

  permissionCmd
    .command("create")
    .aliases(["add", "share"])
    .description("Share a file with someone")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--email <email>", "Email address to share with")
    .requiredOption("--role <role>", "Role: reader, writer, owner, commenter")
    .option("--type <type>", "Permission type: user, group, domain, anyone", "user")
    .action(async function actionCreatePermission(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ email: string; role: string; type: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.createPermission(fileId, opts.email, opts.role, opts.type));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Permission created: ${result.id} on file ${result.fileId}\n` : `Failed to create permission\n`);
    });

  permissionCmd
    .command("delete")
    .aliases(["remove", "rm"])
    .description("Remove access to a file")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--permission-id <id>", "Permission id to remove")
    .action(async function actionDeletePermission(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ permissionId: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.deletePermission(fileId, opts.permissionId));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Permission removed: ${result.id} from file ${result.fileId}\n` : `Failed to remove permission\n`);
    });

  // Comment commands
  const commentCmd = driveCommand.command("comment").description("File comment management");

  commentCmd
    .command("list")
    .aliases(["ls"])
    .description("List comments on a file")
    .argument("<file-id>", "Drive file id")
    .action(async function actionListComments(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const comments = await runWithStableApiError("drive", () => resolvedDeps.listComments(fileId));
      process.stdout.write(`${formatDriveComments(comments, ctx.output.mode)}\n`);
    });

  commentCmd
    .command("create")
    .aliases(["add"])
    .description("Add a comment to a file")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--content <text>", "Comment content")
    .action(async function actionCreateComment(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ content: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.createComment(fileId, opts.content));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Comment created: ${result.id} on file ${result.fileId}\n` : `Failed to create comment\n`);
    });

  commentCmd
    .command("delete")
    .aliases(["remove", "rm"])
    .description("Delete a comment from a file")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--comment-id <id>", "Comment id to delete")
    .action(async function actionDeleteComment(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ commentId: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.deleteComment(fileId, opts.commentId));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Comment deleted: ${result.id} from file ${result.fileId}\n` : `Failed to delete comment\n`);
    });

  // Revision commands
  const revisionCmd = driveCommand.command("revision").description("File revision history management");

  revisionCmd
    .command("list")
    .aliases(["ls"])
    .description("List version history of a file")
    .argument("<file-id>", "Drive file id")
    .action(async function actionListRevisions(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const revisions = await runWithStableApiError("drive", () => resolvedDeps.listRevisions(fileId));
      process.stdout.write(`${formatDriveRevisions(revisions, ctx.output.mode)}\n`);
    });

  revisionCmd
    .command("get")
    .description("Get details of a specific revision")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--revision-id <id>", "Revision id")
    .action(async function actionGetRevision(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ revisionId: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.getRevision(fileId, opts.revisionId));
      process.stdout.write(`${formatDriveRevision(result, ctx.output.mode)}\n`);
    });

  revisionCmd
    .command("delete")
    .aliases(["rm"])
    .description("Delete a revision")
    .argument("<file-id>", "Drive file id")
    .requiredOption("--revision-id <id>", "Revision id to delete")
    .action(async function actionDeleteRevision(this: Command, fileId: string) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ revisionId: string }>();
      const result = await runWithStableApiError("drive", () => resolvedDeps.deleteRevision(fileId, opts.revisionId));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.applied ? `Revision deleted: ${result.id} from file ${result.fileId}\n` : `Failed to delete revision\n`);
    });

  // Quota command
  driveCommand
    .command("quota")
    .description("Show storage quota usage")
    .action(async function actionQuota(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("drive", () => quotaDeps.getQuota());
      process.stdout.write(`${formatDriveQuota(result, ctx.output.mode)}\n`);
    });

  // Trash management commands
  const trashCmd = driveCommand.command("trash-manage").description("Trash management");

  trashCmd
    .command("list")
    .description("List files in trash")
    .option("--page-size <size>", "Number of results per page")
    .option("--page-token <token>", "Token to fetch next page")
    .action(async function actionTrashList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: string; pageToken?: string }>();
      const paginationOpts: PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = parseInt(opts.pageSize, 10);
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
      const result = await runWithStableApiError("drive", () => trashDeps.listTrash(paginationOpts));
      process.stdout.write(`${formatDriveFiles(result, ctx.output.mode)}\n`);
    });

  trashCmd
    .command("empty")
    .description("Empty entire trash")
    .action(async function actionTrashEmpty(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const result = await runWithStableApiError("drive", () => trashDeps.emptyTrash());
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.emptied ? "Trash emptied\n" : "Failed to empty trash\n");
      }
    });

  trashCmd
    .command("restore")
    .description("Restore a file from trash")
    .requiredOption("--id <fileId>", "File ID to restore")
    .action(async function actionTrashRestore(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const result = await runWithStableApiError("drive", () => trashDeps.restoreFromTrash(opts.id));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.restored ? `File restored: ${result.id}\n` : "Failed to restore file\n");
      }
    });

  // Shared drives commands
  const sdCmd = driveCommand.command("shared-drives").description("Shared drives management");

  sdCmd
    .command("list")
    .description("List shared drives")
    .option("--page-size <size>", "Number of results per page")
    .option("--page-token <token>", "Token to fetch next page")
    .action(async function actionSharedDrivesList(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ pageSize?: string; pageToken?: string }>();
      const paginationOpts: PaginationOptions = {};
      if (opts.pageSize !== undefined) paginationOpts.pageSize = parseInt(opts.pageSize, 10);
      if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
      const result = await runWithStableApiError("drive", () => sharedDrivesDeps.listSharedDrives(paginationOpts));
      process.stdout.write(`${formatSharedDrives(result.items, ctx.output.mode)}\n`);
    });

  sdCmd
    .command("get")
    .description("Get shared drive details")
    .requiredOption("--id <driveId>", "Shared drive ID")
    .action(async function actionSharedDrivesGet(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const result = await runWithStableApiError("drive", () => sharedDrivesDeps.getSharedDrive(opts.id));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${result.id}\t${result.name}\n`);
      }
    });

  sdCmd
    .command("create")
    .description("Create a shared drive")
    .requiredOption("--name <name>", "Shared drive name")
    .action(async function actionSharedDrivesCreate(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ name: string }>();
      const result = await runWithStableApiError("drive", () => sharedDrivesDeps.createSharedDrive(opts.name));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.created ? `Shared drive created: ${result.id}\n` : "Failed to create shared drive\n");
      }
    });

  sdCmd
    .command("delete")
    .description("Delete a shared drive")
    .requiredOption("--id <driveId>", "Shared drive ID")
    .action(async function actionSharedDrivesDelete(this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      const ctx = buildExecutionContext(rootOptions);
      const opts = this.opts<{ id: string }>();
      const result = await runWithStableApiError("drive", () => sharedDrivesDeps.deleteSharedDrive(opts.id));
      if (ctx.output.mode === "json") {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.deleted ? `Shared drive deleted: ${result.id}\n` : "Failed to delete shared drive\n");
      }
    });
}
