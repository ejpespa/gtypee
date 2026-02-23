import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";

import { google } from "googleapis";

import type { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type {
  DriveCommandDeps,
  DriveFileSummary,
  DriveDeleteResult,
  DriveCopyResult,
  DriveMoveResult,
  DriveRenameResult,
  DriveMkdirResult,
  DriveFileInfo,
  DrivePermission,
  DrivePermissionResult,
  DriveComment,
  DriveCommentResult,
  DriveRevision,
} from "./commands.js";

export function buildDriveCommandDeps(runtime: ServiceRuntime): Required<DriveCommandDeps> {
  return {
    listFiles: async (): Promise<DriveFileSummary[]> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({
        pageSize: 100,
        fields: "files(id,name,mimeType)",
      });
      const files = res.data.files ?? [];
      return files.map((f) => ({
        id: f.id ?? "",
        name: f.name ?? "",
        mimeType: f.mimeType ?? "",
      }));
    },

    searchFiles: async (query: string): Promise<DriveFileSummary[]> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({
        q: query,
        pageSize: 100,
        fields: "files(id,name,mimeType)",
      });
      const files = res.data.files ?? [];
      return files.map((f) => ({
        id: f.id ?? "",
        name: f.name ?? "",
        mimeType: f.mimeType ?? "",
      }));
    },

    downloadFile: async (id: string, out?: string): Promise<{ id: string; path: string; downloaded: boolean }> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      // Resolve the output path: use provided path, or derive from file metadata
      let outputPath = out ?? "";
      if (outputPath === "") {
        const meta = await drive.files.get({ fileId: id, fields: "name" });
        outputPath = meta.data.name ?? `${id}.download`;
      }

      const res = await drive.files.get(
        { fileId: id, alt: "media" },
        { responseType: "arraybuffer" },
      );

      await writeFile(outputPath, Buffer.from(res.data as ArrayBuffer));

      return { id, path: outputPath, downloaded: true };
    },

    uploadFile: async (path: string): Promise<{ id: string; name: string; uploaded: boolean }> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });
      const fileName = basename(path);
      const res = await drive.files.create({
        requestBody: { name: fileName },
        media: { body: createReadStream(path) },
        fields: "id,name",
      });
      return {
        id: res.data.id ?? "",
        name: res.data.name ?? fileName,
        uploaded: true,
      };
    },

    deleteFile: async (id: string, permanent: boolean): Promise<DriveDeleteResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      if (permanent) {
        await drive.files.delete({ fileId: id });
      } else {
        await drive.files.update({
          fileId: id,
          requestBody: { trashed: true },
        });
      }

      return { id, deleted: true, permanent };
    },

    copyFile: async (id: string, name: string, parentId?: string): Promise<DriveCopyResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const requestBody: { name: string; parents?: string[] } = { name };
      if (parentId !== undefined) {
        requestBody.parents = [parentId];
      }

      const res = await drive.files.copy({
        fileId: id,
        requestBody,
        fields: "id,name",
      });

      return {
        id: res.data.id ?? "",
        name: res.data.name ?? name,
        originalId: id,
        copied: true,
      };
    },

    moveFile: async (id: string, parentId: string): Promise<DriveMoveResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      // Get current parents
      const file = await drive.files.get({
        fileId: id,
        fields: "name,parents",
      });

      const previousParents = (file.data.parents ?? []).join(",");

      const res = await drive.files.update({
        fileId: id,
        addParents: parentId,
        removeParents: previousParents,
        fields: "id,name,parents",
      });

      return {
        id: res.data.id ?? id,
        name: res.data.name ?? "",
        parentId,
        moved: true,
      };
    },

    renameFile: async (id: string, name: string): Promise<DriveRenameResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.files.update({
        fileId: id,
        requestBody: { name },
        fields: "id,name",
      });

      return {
        id: res.data.id ?? id,
        name: res.data.name ?? name,
        renamed: true,
      };
    },

    createFolder: async (name: string, parentId?: string): Promise<DriveMkdirResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const requestBody: { name: string; mimeType: string; parents?: string[] } = {
        name,
        mimeType: "application/vnd.google-apps.folder",
      };
      if (parentId !== undefined) {
        requestBody.parents = [parentId];
      }

      const res = await drive.files.create({
        requestBody,
        fields: "id,name",
      });

      return {
        id: res.data.id ?? "",
        name: res.data.name ?? name,
        created: true,
      };
    },

    getFileInfo: async (id: string): Promise<DriveFileInfo> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.files.get({
        fileId: id,
        fields: "id,name,mimeType,size,createdTime,modifiedTime,parents",
      });

      const result: DriveFileInfo = {
        id: res.data.id ?? id,
        name: res.data.name ?? "",
        mimeType: res.data.mimeType ?? "",
      };

      if (res.data.size !== undefined && res.data.size !== null) {
        result.size = res.data.size;
      }
      if (res.data.createdTime !== undefined && res.data.createdTime !== null) {
        result.createdTime = res.data.createdTime;
      }
      if (res.data.modifiedTime !== undefined && res.data.modifiedTime !== null) {
        result.modifiedTime = res.data.modifiedTime;
      }
      if (res.data.parents !== undefined && res.data.parents !== null) {
        result.parents = res.data.parents;
      }

      return result;
    },

    // Permission operations
    listPermissions: async (fileId: string): Promise<DrivePermission[]> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.permissions.list({
        fileId,
        fields: "permissions(id,type,role,emailAddress)",
      });

      const permissions = res.data.permissions ?? [];
      return permissions
        .filter((p) => p.id && p.type && p.role)
        .map((p) => {
          const perm: DrivePermission = {
            id: p.id!,
            type: p.type!,
            role: p.role!,
          };
          if (p.emailAddress !== undefined && p.emailAddress !== null) {
            perm.emailAddress = p.emailAddress;
          }
          return perm;
        });
    },

    createPermission: async (fileId: string, email: string, role: string, type: string): Promise<DrivePermissionResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.permissions.create({
        fileId,
        requestBody: {
          type,
          role,
          emailAddress: email,
        },
        fields: "id",
      });

      return {
        id: res.data.id ?? "",
        fileId,
        applied: true,
      };
    },

    deletePermission: async (fileId: string, permissionId: string): Promise<DrivePermissionResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      await drive.permissions.delete({
        fileId,
        permissionId,
      });

      return {
        id: permissionId,
        fileId,
        applied: true,
      };
    },

    // Comment operations
    listComments: async (fileId: string): Promise<DriveComment[]> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.comments.list({
        fileId,
        fields: "comments(id,content,author,createdTime)",
        includeDeleted: false,
      });

      const comments = res.data.comments ?? [];
      return comments.map((c) => ({
        id: c.id ?? "",
        content: c.content ?? "",
        author: c.author?.displayName ?? "Unknown",
        createdTime: c.createdTime ?? "",
      }));
    },

    createComment: async (fileId: string, content: string): Promise<DriveCommentResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.comments.create({
        fileId,
        requestBody: {
          content,
        },
        fields: "id",
      });

      return {
        id: res.data.id ?? "",
        fileId,
        applied: true,
      };
    },

    deleteComment: async (fileId: string, commentId: string): Promise<DriveCommentResult> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      await drive.comments.delete({
        fileId,
        commentId,
      });

      return {
        id: commentId,
        fileId,
        applied: true,
      };
    },

    // Revision operations
    listRevisions: async (fileId: string): Promise<DriveRevision[]> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.revisions.list({
        fileId,
        fields: "revisions(id,modifiedTime,size,keepForever)",
      });

      const revisions = res.data.revisions ?? [];
      return revisions
        .filter((r) => r.id && r.modifiedTime)
        .map((r) => {
          const rev: DriveRevision = {
            id: r.id!,
            modifiedTime: r.modifiedTime!,
            keepForever: r.keepForever ?? false,
          };
          if (r.size !== undefined && r.size !== null) {
            rev.size = r.size;
          }
          return rev;
        });
    },

    getRevision: async (fileId: string, revisionId: string): Promise<DriveRevision> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      const res = await drive.revisions.get({
        fileId,
        revisionId,
        fields: "id,modifiedTime,size,keepForever",
      });

      const result: DriveRevision = {
        id: res.data.id ?? revisionId,
        modifiedTime: res.data.modifiedTime ?? "",
        keepForever: res.data.keepForever ?? false,
      };
      if (res.data.size !== undefined && res.data.size !== null) {
        result.size = res.data.size;
      }
      return result;
    },

    deleteRevision: async (fileId: string, revisionId: string): Promise<{ id: string; fileId: string; applied: boolean }> => {
      const auth = await runtime.getClient(scopes("drive"));
      const drive = google.drive({ version: "v3", auth });

      await drive.revisions.delete({
        fileId,
        revisionId,
      });

      return {
        id: revisionId,
        fileId,
        applied: true,
      };
    },
  };
}
