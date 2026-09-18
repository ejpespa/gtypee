import { describe, it, expect, vi } from "vitest";
import { google } from "googleapis";
import {
  buildWorkspaceOffboardDeps,
  buildWorkspaceOffboardPipelineDeps,
} from "../../../../src/cmd/workspace/runtime.js";

describe("buildWorkspaceOffboardDeps & buildWorkspaceOffboardPipelineDeps", () => {
  it("provides offboardUser with directory and token eviction methods", () => {
    const mockRuntime = { getClient: vi.fn().mockResolvedValue({}) };
    const deps = buildWorkspaceOffboardDeps(mockRuntime as any);
    expect(typeof deps.offboardUser).toBe("function");
    expect(typeof deps.getPipelineDeps).toBe("function");
  });

  describe("Directory API wiring", () => {
    it("wires users.get for caller (me) and target user", async () => {
      const mockAdmin = {
        users: {
          get: vi.fn().mockImplementation(({ userKey }) => {
            if (userKey === "me") {
              return Promise.resolve({ data: { primaryEmail: "admin@example.com" } });
            }
            return Promise.resolve({
              data: { id: "12345", primaryEmail: userKey, isAdmin: true },
            });
          }),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const callerEmail = await deps.getCallerEmail();
      expect(callerEmail).toBe("admin@example.com");
      expect(mockAdmin.users.get).toHaveBeenCalledWith({ userKey: "me" });

      const target = await deps.getTargetUser("target@example.com");
      expect(target).toEqual({
        id: "12345",
        primaryEmail: "target@example.com",
        isAdmin: true,
      });
      expect(mockAdmin.users.get).toHaveBeenCalledWith({ userKey: "target@example.com" });
    });

    it("wires users.makeAdmin for demoting admin", async () => {
      const mockAdmin = {
        users: {
          makeAdmin: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.demoteAdmin!("target@example.com");
      expect(res.success).toBe(true);
      expect(mockAdmin.users.makeAdmin).toHaveBeenCalledWith({
        userKey: "target@example.com",
        requestBody: { status: false },
      });
    });

    it("wires users.patch to suspend, scramble password, and clear recovery info", async () => {
      const mockAdmin = {
        users: {
          patch: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.containUser("target@example.com");
      expect(res.success).toBe(true);
      expect(mockAdmin.users.patch).toHaveBeenCalledWith({
        userKey: "target@example.com",
        requestBody: expect.objectContaining({
          suspended: true,
          changePasswordAtNextLogin: false,
          recoveryEmail: "",
          recoveryPhone: "",
        }),
      });

      const patchCall = mockAdmin.users.patch.mock.calls[0]?.[0];
      expect(patchCall).toBeDefined();
      expect(typeof patchCall!.requestBody.password).toBe("string");
      expect(patchCall!.requestBody.password.length).toBe(28);
    });

    it("counts active non-suspended admins", async () => {
      const mockAdmin = {
        users: {
          list: vi.fn().mockResolvedValue({
            data: { users: [{ id: "1" }, { id: "2" }] },
          }),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const count = await deps.countActiveAdmins!();
      expect(count).toBe(2);
      expect(mockAdmin.users.list).toHaveBeenCalledWith({
        customer: "my_customer",
        query: "isAdmin=true isSuspended=false",
      });
    });
  });

  describe("Tokens API and 2FA eviction wiring", () => {
    it("wires tokens.list, tokens.delete, 2FA invalidate, and signOut", async () => {
      const mockAdmin = {
        tokens: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ clientId: "token-1" }, { clientId: "token-2" }, { clientId: "" }],
            },
          }),
          delete: vi.fn().mockResolvedValue({}),
        },
        twoStepVerification: {
          verificationCodes: {
            invalidate: vi.fn().mockResolvedValue({}),
          },
        },
        users: {
          signOut: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.evictSessionsAndTokens("target@example.com");
      expect(res.success).toBe(true);
      expect(res.tokensRevoked).toBe(2);
      expect(mockAdmin.tokens.list).toHaveBeenCalledWith({ userKey: "target@example.com" });
      expect(mockAdmin.tokens.delete).toHaveBeenCalledWith({
        userKey: "target@example.com",
        clientId: "token-1",
      });
      expect(mockAdmin.tokens.delete).toHaveBeenCalledWith({
        userKey: "target@example.com",
        clientId: "token-2",
      });
      expect(mockAdmin.twoStepVerification.verificationCodes.invalidate).toHaveBeenCalledWith({
        userKey: "target@example.com",
      });
      expect(mockAdmin.users.signOut).toHaveBeenCalledWith({ userKey: "target@example.com" });
    });

    it("handles 2FA invalidate errors gracefully without failing eviction", async () => {
      const mockAdmin = {
        tokens: {
          list: vi.fn().mockResolvedValue({ data: { items: [] } }),
          delete: vi.fn(),
        },
        twoStepVerification: {
          verificationCodes: {
            invalidate: vi.fn().mockRejectedValue(new Error("2FA not enrolled")),
          },
        },
        users: {
          signOut: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.evictSessionsAndTokens("target@example.com");
      expect(res.success).toBe(true);
      expect(res.tokensRevoked).toBe(0);
      expect(mockAdmin.users.signOut).toHaveBeenCalledWith({ userKey: "target@example.com" });
    });
  });

  describe("Mobile devices selective wipe wiring", () => {
    it("wires mobiledevices.list and mobiledevices.action with wipe_store", async () => {
      const mockAdmin = {
        mobiledevices: {
          list: vi.fn().mockResolvedValue({
            data: {
              mobiledevices: [{ resourceId: "res-1" }, { resourceId: "res-2" }],
            },
          }),
          action: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.wipeUserDevices!("target@example.com");
      expect(res.wipedCount).toBe(2);
      expect(mockAdmin.mobiledevices.list).toHaveBeenCalledWith({
        customerId: "my_customer",
        query: "email:target@example.com",
      });
      expect(mockAdmin.mobiledevices.action).toHaveBeenCalledWith({
        customerId: "my_customer",
        resourceId: "res-1",
        requestBody: { action: "wipe_store" },
      });
      expect(mockAdmin.mobiledevices.action).toHaveBeenCalledWith({
        customerId: "my_customer",
        resourceId: "res-2",
        requestBody: { action: "wipe_store" },
      });
    });

    it("gracefully catches 403/404 when MDM is unconfigured", async () => {
      const mockAdmin = {
        mobiledevices: {
          list: vi.fn().mockRejectedValue(new Error("403 Forbidden: Mobile Management not enabled")),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.wipeUserDevices!("target@example.com");
      expect(res.wipedCount).toBe(0);
      expect(res.error).toContain("403 Forbidden");
    });
  });

  describe("Data Transfer API wiring", () => {
    it("wires datatransfer.transfers.insert with resolved user IDs", async () => {
      const mockAdmin = {
        users: {
          get: vi.fn().mockImplementation(({ userKey }) => {
            if (userKey === "src@example.com") {
              return Promise.resolve({ data: { id: "uid-src" } });
            }
            if (userKey === "dest@example.com") {
              return Promise.resolve({ data: { id: "uid-dest" } });
            }
            return Promise.reject(new Error("not found"));
          }),
        },
      };

      const mockDataTransfer = {
        transfers: {
          insert: vi.fn().mockResolvedValue({
            data: { id: "transfer-xyz-123" },
          }),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, mockDataTransfer);
      const res = await deps.transferDriveFiles!("src@example.com", "dest@example.com");
      expect(res.success).toBe(true);
      expect(res.transferId).toBe("transfer-xyz-123");
      expect(mockDataTransfer.transfers.insert).toHaveBeenCalledWith({
        requestBody: {
          oldOwnerUserId: "uid-src",
          newOwnerUserId: "uid-dest",
          applicationDataTransfers: [
            {
              applicationId: "435070579839",
              applicationTransferParams: [{ key: "PRIVACY_LEVEL", value: ["SHARED", "PRIVATE"] }],
            },
          ],
        },
      });
    });

    it("handles missing user IDs gracefully", async () => {
      const mockAdmin = {
        users: {
          get: vi.fn().mockResolvedValue({ data: {} }),
        },
      };
      const mockDataTransfer = { transfers: { insert: vi.fn() } };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, mockDataTransfer);
      const res = await deps.transferDriveFiles!("src@example.com", "dest@example.com");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Could not resolve numeric user IDs");
      expect(mockDataTransfer.transfers.insert).not.toHaveBeenCalled();
    });
  });

  describe("Groups membership removal wiring", () => {
    it("wires groups.list and members.delete", async () => {
      const mockAdmin = {
        groups: {
          list: vi.fn().mockResolvedValue({
            data: {
              groups: [{ id: "grp-1" }, { id: "grp-2" }],
            },
          }),
        },
        members: {
          delete: vi.fn().mockResolvedValue({}),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.removeFromAllGroups!("target@example.com");
      expect(res.removedCount).toBe(2);
      expect(mockAdmin.groups.list).toHaveBeenCalledWith({ userKey: "target@example.com" });
      expect(mockAdmin.members.delete).toHaveBeenCalledWith({
        groupKey: "grp-1",
        memberKey: "target@example.com",
      });
      expect(mockAdmin.members.delete).toHaveBeenCalledWith({
        groupKey: "grp-2",
        memberKey: "target@example.com",
      });
    });

    it("handles group deletion errors gracefully", async () => {
      const mockAdmin = {
        groups: {
          list: vi.fn().mockRejectedValue(new Error("500 Internal Error")),
        },
      };

      const deps = buildWorkspaceOffboardPipelineDeps(mockAdmin, {});
      const res = await deps.removeFromAllGroups!("target@example.com");
      expect(res.removedCount).toBe(0);
      expect(res.error).toContain("500 Internal Error");
    });
  });

  describe("buildWorkspaceOffboardDeps full flow", () => {
    it("executes offboardUser through orchestrator with pipeline deps", async () => {
      const mockAdmin = {
        users: {
          get: vi.fn().mockImplementation(({ userKey }) => {
            if (userKey === "me") {
              return Promise.resolve({ data: { primaryEmail: "caller-admin@example.com" } });
            }
            return Promise.resolve({
              data: { id: "target-id", primaryEmail: userKey, isAdmin: false },
            });
          }),
          patch: vi.fn().mockResolvedValue({}),
          signOut: vi.fn().mockResolvedValue({}),
        },
        tokens: {
          list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
        twoStepVerification: {
          verificationCodes: {
            invalidate: vi.fn().mockResolvedValue({}),
          },
        },
        mobiledevices: {
          list: vi.fn().mockResolvedValue({ data: { mobiledevices: [] } }),
        },
      };

      const spy = vi.spyOn(google, "admin").mockReturnValue(mockAdmin as any);

      const mockRuntime = {
        getClient: vi.fn().mockResolvedValue({ request: vi.fn() }),
      };

      const deps = buildWorkspaceOffboardDeps(mockRuntime as any);
      const summary = await deps.offboardUser({ email: "user@example.com", dryRun: true });
      expect(summary.success).toBe(true);
      expect(summary.dryRun).toBe(true);
      expect(summary.email).toBe("user@example.com");

      spy.mockRestore();
    });
  });
});
