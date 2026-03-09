import { describe, expect, it, vi } from "vitest";
import type { OAuth2Client } from "google-auth-library";

import { ServiceRuntime } from "../../src/googleapi/auth-factory.js";
import { scopes } from "../../src/googleauth/service.js";

/**
 * Creates a ServiceRuntime whose getClient() is spied on.
 * Returns the spy so we can assert on the scopes argument.
 */
function createSpiedRuntime(): { runtime: ServiceRuntime; getClientSpy: ReturnType<typeof vi.fn> } {
  const fakeClient = {} as OAuth2Client;
  const runtime = new ServiceRuntime({
    resolveAccount: async () => ({
      email: "sa@project.iam.gserviceaccount.com",
      clientOverride: "",
      serviceAccount: "sa@project.iam.gserviceaccount.com",
    }),
    readServiceAccountKey: async () => ({
      type: "service_account",
      client_email: "sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
      project_id: "my-project",
    }),
  });

  // Spy on getClient to capture scopes
  const originalGetClient = runtime.getClient.bind(runtime);
  const getClientSpy = vi.fn(async (s?: string[]) => {
    // Call original to verify it works, but we mainly care about what scopes were passed
    return originalGetClient(s);
  });
  runtime.getClient = getClientSpy;

  return { runtime, getClientSpy };
}

describe("service runtimes pass correct scopes to getClient()", () => {
  it("drive runtime passes drive scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildDriveCommandDeps } = await import("../../src/cmd/drive/runtime.js");
    const deps = buildDriveCommandDeps(runtime);

    // Call any dep function - they all call runtime.getClient() internally
    // This will fail because the Google API call requires real auth, but we
    // can check what scopes were passed to getClient before the API call fails
    try {
      await deps.listFiles();
    } catch {
      // Expected: Google API call fails without real auth
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("drive"));
  });

  it("docs runtime passes docs scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildDocsCommandDeps } = await import("../../src/cmd/docs/runtime.js");
    const deps = buildDocsCommandDeps(runtime);

    try {
      await deps.createDoc("test");
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("docs"));
  });

  it("sheets runtime passes sheets scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildSheetsCommandDeps } = await import("../../src/cmd/sheets/runtime.js");
    const deps = buildSheetsCommandDeps(runtime);

    try {
      await deps.createSheet("test");
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("sheets"));
  });

  it("slides runtime passes slides scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildSlidesCommandDeps } = await import("../../src/cmd/slides/runtime.js");
    const deps = buildSlidesCommandDeps(runtime);

    try {
      await deps.createPresentation("test");
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("slides"));
  });

  it("people runtime passes people scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildPeopleCommandDeps } = await import("../../src/cmd/people/runtime.js");
    const deps = buildPeopleCommandDeps(runtime);

    try {
      await deps.me();
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("people"));
  });

  it("tasks runtime passes tasks scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildTasksCommandDeps } = await import("../../src/cmd/tasks/runtime.js");
    const deps = buildTasksCommandDeps(runtime);

    try {
      await deps.listTasks();
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("tasks"));
  });

  it("forms runtime passes forms scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildFormsCommandDeps } = await import("../../src/cmd/forms/runtime.js");
    const deps = buildFormsCommandDeps(runtime);

    try {
      await deps.createForm("test");
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("forms"));
  });

  it("appscript runtime passes appscript scopes", async () => {
    const { runtime, getClientSpy } = createSpiedRuntime();
    const { buildAppScriptCommandDeps } = await import("../../src/cmd/appscript/runtime.js");
    const deps = buildAppScriptCommandDeps(runtime);

    try {
      await deps.listProjects();
    } catch {
      // Expected
    }

    expect(getClientSpy).toHaveBeenCalledWith(scopes("appscript"));
  });
});
