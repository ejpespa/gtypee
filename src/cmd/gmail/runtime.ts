import { google } from "googleapis";

import { ServiceRuntime, type ServiceRuntimeOptions } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { PaginationOptions } from "../../types/pagination.js";
import type {
  GmailCommandDeps,
  GmailDraftDeps,
  GmailThreadDeps,
  GmailLabelDeps,
  GmailFilterDeps,
  GmailSignatureDeps,
  GmailMessageDetail,
} from "./commands.js";

export function buildGmailCommandDeps(options: ServiceRuntimeOptions): Required<GmailCommandDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    sendEmail: async (input) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const rawMessage = [
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        input.body,
      ].join("\r\n");

      const encodedMessage = Buffer.from(rawMessage).toString("base64url");

      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      });

      return {
        id: response.data.id ?? "",
        threadId: response.data.threadId ?? "",
        accepted: response.status === 200,
      };
    },

    listMessages: async (options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const params: { userId: string; maxResults: number; pageToken?: string } = {
        userId: "me",
        maxResults: options?.pageSize ?? 50,
      };
      if (options?.pageToken !== undefined) {
        params.pageToken = options.pageToken;
      }
      const res = await gmail.users.messages.list(params);

      const messageIds = res.data.messages ?? [];
      if (messageIds.length === 0) return { items: [] };

      const items = await Promise.all(
        messageIds.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["Subject"],
          });
          const subjectHeader = detail.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === "subject",
          );
          return {
            id: detail.data.id ?? "",
            threadId: detail.data.threadId ?? "",
            subject: subjectHeader?.value ?? "(no subject)",
          };
        }),
      );

      const result: { items: typeof items; nextPageToken?: string } = { items };
      if (res.data.nextPageToken) {
        result.nextPageToken = res.data.nextPageToken;
      }
      return result;
    },

    searchEmails: async (query) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 50,
      });

      const messageIds = listResponse.data.messages ?? [];
      if (messageIds.length === 0) return [];

      const results = await Promise.all(
        messageIds.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["Subject"],
          });
          const subjectHeader = detail.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === "subject",
          );
          return {
            id: detail.data.id ?? "",
            threadId: detail.data.threadId ?? "",
            subject: subjectHeader?.value ?? "(no subject)",
          };
        }),
      );

      return results;
    },

    listLabels: async () => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.labels.list({ userId: "me" });
      const labels = response.data.labels ?? [];

      return labels.map((label) => ({
        id: label.id ?? "",
        name: label.name ?? "",
      }));
    },

    getMessage: async (messageId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const headers = response.data.payload?.headers ?? [];
      const getHeader = (name: string): string => {
        const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
        return header?.value ?? "";
      };

      // Extract text body from the message
      let body = "";
      const payload = response.data.payload;

      if (payload?.body?.data) {
        // Simple text/plain message
        body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      } else if (payload?.parts) {
        // Multipart message - find text/plain part
        const textPart = payload.parts.find(
          (part) => part.mimeType === "text/plain" || part.mimeType?.startsWith("text/plain"),
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
        } else if (payload.parts[0]?.body?.data) {
          // Fallback to first part
          body = Buffer.from(payload.parts[0].body.data, "base64url").toString("utf-8");
        }
      }

      return {
        id: response.data.id ?? "",
        threadId: response.data.threadId ?? "",
        from: getHeader("from"),
        to: getHeader("to"),
        subject: getHeader("subject") || "(no subject)",
        date: getHeader("date"),
        body,
      };
    },

    deleteMessage: async (messageId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.messages.delete({
          userId: "me",
          id: messageId,
        });
        return { id: messageId, applied: true };
      } catch {
        return { id: messageId, applied: false };
      }
    },

    trashMessage: async (messageId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.messages.trash({
          userId: "me",
          id: messageId,
        });
        return { id: messageId, applied: true };
      } catch {
        return { id: messageId, applied: false };
      }
    },

    untrashMessage: async (messageId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.messages.untrash({
          userId: "me",
          id: messageId,
        });
        return { id: messageId, applied: true };
      } catch {
        return { id: messageId, applied: false };
      }
    },

    modifyMessage: async (messageId: string, addLabels?: string[], removeLabels?: string[]) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.messages.modify({
          userId: "me",
          id: messageId,
          requestBody: {
            addLabelIds: addLabels ?? null,
            removeLabelIds: removeLabels ?? null,
          },
        });
        return {
          id: messageId,
          addedLabels: addLabels ?? [],
          removedLabels: removeLabels ?? [],
          applied: true,
        };
      } catch {
        return {
          id: messageId,
          addedLabels: addLabels ?? [],
          removedLabels: removeLabels ?? [],
          applied: false,
        };
      }
    },
  };
}

/**
 * Helper function to extract message details from Gmail API response
 */
function extractMessageDetail(message: { id?: string | null; threadId?: string | null; payload?: { headers?: Array<{ name?: string | null; value?: string | null }>; body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }> } }): GmailMessageDetail {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string): string => {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value ?? "";
  };

  // Extract text body from the message
  let body = "";
  const payload = message.payload;

  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  } else if (payload?.parts) {
    const textPart = payload.parts.find(
      (part) => part.mimeType === "text/plain" || part.mimeType?.startsWith("text/plain"),
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    } else if (payload.parts[0]?.body?.data) {
      body = Buffer.from(payload.parts[0].body.data, "base64url").toString("utf-8");
    }
  }

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeader("from"),
    to: getHeader("to"),
    subject: getHeader("subject") || "(no subject)",
    date: getHeader("date"),
    body,
  };
}

export function buildGmailDraftDeps(options: ServiceRuntimeOptions): Required<GmailDraftDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    createDraft: async (input) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const rawMessage = [
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        input.body,
      ].join("\r\n");

      const encodedMessage = Buffer.from(rawMessage).toString("base64url");

      try {
        const response = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: { raw: encodedMessage },
          },
        });

        return {
          id: response.data.id ?? "",
          message: {
            id: response.data.message?.id ?? "",
            threadId: response.data.message?.threadId ?? "",
            subject: input.subject,
          },
          applied: true,
        };
      } catch {
        return {
          id: "",
          message: { id: "", threadId: "", subject: "" },
          applied: false,
        };
      }
    },

    listDrafts: async (options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const params: { userId: string; maxResults: number; pageToken?: string } = {
          userId: "me",
          maxResults: options?.pageSize ?? 100,
        };
        if (options?.pageToken !== undefined) {
          params.pageToken = options.pageToken;
        }
        const response = await gmail.users.drafts.list(params);

        const drafts = response.data.drafts ?? [];

        const items = await Promise.all(
          drafts.map(async (draft) => {
            const detail = await gmail.users.drafts.get({
              userId: "me",
              id: draft.id!,
              format: "metadata",
            });
            const subjectHeader = detail.data.message?.payload?.headers?.find(
              (h) => h.name?.toLowerCase() === "subject",
            );
            return {
              id: draft.id ?? "",
              message: {
                id: detail.data.message?.id ?? "",
                threadId: detail.data.message?.threadId ?? "",
                subject: subjectHeader?.value ?? "(no subject)",
              },
            };
          }),
        );

        const result: { items: typeof items; nextPageToken?: string } = { items };
        if (response.data.nextPageToken) {
          result.nextPageToken = response.data.nextPageToken;
        }
        return result;
      } catch {
        return { items: [] };
      }
    },

    getDraft: async (draftId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.drafts.get({
        userId: "me",
        id: draftId,
        format: "full",
      });

      return {
        id: response.data.id ?? "",
        message: extractMessageDetail(response.data.message!),
      };
    },

    deleteDraft: async (draftId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.drafts.delete({
          userId: "me",
          id: draftId,
        });
        return { id: draftId, applied: true };
      } catch {
        return { id: draftId, applied: false };
      }
    },

    sendDraft: async (draftId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const response = await gmail.users.drafts.send({
          userId: "me",
          requestBody: { id: draftId },
        });

        return {
          id: response.data.id ?? "",
          threadId: response.data.threadId ?? "",
          sent: response.status === 200,
        };
      } catch {
        return {
          id: "",
          threadId: "",
          sent: false,
        };
      }
    },
  };
}

export function buildGmailThreadDeps(options: ServiceRuntimeOptions): Required<GmailThreadDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listThreads: async (query?: string, options?: PaginationOptions) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const params: { userId: string; maxResults: number; q?: string; pageToken?: string } = {
          userId: "me",
          maxResults: options?.pageSize ?? 100,
        };
        if (query) {
          params.q = query;
        }
        if (options?.pageToken !== undefined) {
          params.pageToken = options.pageToken;
        }
        const response = await gmail.users.threads.list(params);

        const threads = response.data.threads ?? [];

        const items = await Promise.all(
          threads.map(async (thread: { id?: string | null }) => {
            const detail = await gmail.users.threads.get({
              userId: "me",
              id: thread.id!,
              format: "metadata",
            });
            return {
              id: thread.id ?? "",
              snippet: detail.data.snippet ?? "",
              messageCount: detail.data.messages?.length ?? 0,
            };
          }),
        );

        const result: { items: typeof items; nextPageToken?: string } = { items };
        if (response.data.nextPageToken) {
          result.nextPageToken = response.data.nextPageToken;
        }
        return result;
      } catch {
        return { items: [] };
      }
    },

    getThread: async (threadId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });

      const messages = response.data.messages ?? [];

      return {
        id: response.data.id ?? "",
        messages: messages.map((msg) => extractMessageDetail(msg)),
      };
    },
  };
}

export function buildGmailLabelDeps(options: ServiceRuntimeOptions): Required<GmailLabelDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    createLabel: async (input) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const requestBody: Record<string, unknown> = {
          name: input.name,
        };
        if (input.textColor && input.backgroundColor) {
          requestBody.color = {
            textColor: input.textColor,
            backgroundColor: input.backgroundColor,
          };
        }

        const response = await gmail.users.labels.create({
          userId: "me",
          requestBody,
        });

        return {
          id: response.data.id ?? "",
          name: response.data.name ?? "",
          applied: true,
        };
      } catch {
        return {
          id: "",
          name: input.name,
          applied: false,
        };
      }
    },

    getLabel: async (labelId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.labels.get({
        userId: "me",
        id: labelId,
      });

      const result: {
        id: string;
        name: string;
        type: string;
        messagesTotal?: number;
        messagesUnread?: number;
        threadsTotal?: number;
        threadsUnread?: number;
        color?: { textColor: string; backgroundColor: string };
      } = {
        id: response.data.id ?? "",
        name: response.data.name ?? "",
        type: response.data.type ?? "",
      };
      if (response.data.messagesTotal != null) {
        result.messagesTotal = response.data.messagesTotal;
      }
      if (response.data.messagesUnread != null) {
        result.messagesUnread = response.data.messagesUnread;
      }
      if (response.data.threadsTotal != null) {
        result.threadsTotal = response.data.threadsTotal;
      }
      if (response.data.threadsUnread != null) {
        result.threadsUnread = response.data.threadsUnread;
      }
      if (response.data.color) {
        result.color = {
          textColor: response.data.color.textColor ?? "",
          backgroundColor: response.data.color.backgroundColor ?? "",
        };
      }
      return result;
    },

    updateLabel: async (labelId: string, name: string, textColor?: string, backgroundColor?: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const requestBody: Record<string, unknown> = {
          name,
        };
        if (textColor && backgroundColor) {
          requestBody.color = {
            textColor,
            backgroundColor,
          };
        }

        const response = await gmail.users.labels.update({
          userId: "me",
          id: labelId,
          requestBody,
        });

        return {
          id: response.data.id ?? "",
          name: response.data.name ?? "",
          applied: true,
        };
      } catch {
        return {
          id: labelId,
          name,
          applied: false,
        };
      }
    },

    deleteLabel: async (labelId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.labels.delete({
          userId: "me",
          id: labelId,
        });
        return { id: labelId, applied: true };
      } catch {
        return { id: labelId, applied: false };
      }
    },
  };
}

export function buildGmailFilterDeps(options: ServiceRuntimeOptions): Required<GmailFilterDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listFilters: async () => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const response = await gmail.users.settings.filters.list({
          userId: "me",
        });

        const filters = response.data.filter ?? [];

        return filters.map((filter) => ({
          id: filter.id ?? "",
          query: filter.criteria?.query ?? "",
          addLabelIds: filter.action?.addLabelIds ?? [],
        }));
      } catch {
        return [];
      }
    },

    createFilter: async (query: string, addLabelIds: string[]) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const response = await gmail.users.settings.filters.create({
          userId: "me",
          requestBody: {
            criteria: { query },
            action: { addLabelIds },
          },
        });

        return {
          id: response.data.id ?? "",
          query,
          addLabelIds,
          applied: true,
        };
      } catch {
        return {
          id: "",
          query,
          addLabelIds,
          applied: false,
        };
      }
    },

    deleteFilter: async (filterId: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.settings.filters.delete({
          userId: "me",
          id: filterId,
        });
        return { id: filterId, applied: true };
      } catch {
        return { id: filterId, applied: false };
      }
    },
  };
}

export function buildGmailSignatureDeps(options: ServiceRuntimeOptions): Required<GmailSignatureDeps> {
  const runtime = new ServiceRuntime(options);

  return {
    listSendAs: async () => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        const response = await gmail.users.settings.sendAs.list({
          userId: "me",
        });

        const aliases = response.data.sendAs ?? [];

        return aliases.map((alias) => {
          const result: {
            sendAsEmail: string;
            isPrimary: boolean;
            displayName?: string;
            signature?: string;
            isDefault?: boolean;
            treatAsAlias?: boolean;
            verificationStatus?: string;
          } = {
            sendAsEmail: alias.sendAsEmail ?? "",
            isPrimary: alias.isPrimary ?? false,
          };
          if (alias.displayName != null) {
            result.displayName = alias.displayName;
          }
          if (alias.signature != null) {
            result.signature = alias.signature;
          }
          if (alias.isDefault != null) {
            result.isDefault = alias.isDefault;
          }
          if (alias.treatAsAlias != null) {
            result.treatAsAlias = alias.treatAsAlias;
          }
          if (alias.verificationStatus != null) {
            result.verificationStatus = alias.verificationStatus;
          }
          return result;
        });
      } catch {
        return [];
      }
    },

    getSendAs: async (email: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.settings.sendAs.get({
        userId: "me",
        sendAsEmail: email,
      });

      const result: {
        sendAsEmail: string;
        isPrimary: boolean;
        displayName?: string;
        signature?: string;
        isDefault?: boolean;
        treatAsAlias?: boolean;
        verificationStatus?: string;
      } = {
        sendAsEmail: response.data.sendAsEmail ?? "",
        isPrimary: response.data.isPrimary ?? false,
      };
      if (response.data.displayName != null) {
        result.displayName = response.data.displayName;
      }
      if (response.data.signature != null) {
        result.signature = response.data.signature;
      }
      if (response.data.isDefault != null) {
        result.isDefault = response.data.isDefault;
      }
      if (response.data.treatAsAlias != null) {
        result.treatAsAlias = response.data.treatAsAlias;
      }
      if (response.data.verificationStatus != null) {
        result.verificationStatus = response.data.verificationStatus;
      }
      return result;
    },

    setSignature: async (email: string, signature: string) => {
      const auth = await runtime.getClient(scopes("gmail"));
      const gmail = google.gmail({ version: "v1", auth });

      try {
        await gmail.users.settings.sendAs.update({
          userId: "me",
          sendAsEmail: email,
          requestBody: { signature },
        });
        return { email, applied: true };
      } catch {
        return { email, applied: false };
      }
    },
  };
}
