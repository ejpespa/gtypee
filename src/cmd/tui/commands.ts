import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { MasterLayoutWrapper } from "./MasterLayout.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import { buildWorkspaceReportCommandDeps } from "../workspace/runtime.js";

export function registerTuiCommand(root: Command): void {
  root
    .command("tui")
    .description("Launch the interactive gtypee Master Dashboard")
    .action(async function (this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;

            const workspaceDeps = buildWorkspaceReportCommandDeps({
         resolveAccount: async () => ({
            email: rootOptions.account || "",
            clientOverride: rootOptions.client || "default",
            serviceAccount: rootOptions.sa,
            impersonate: rootOptions.impersonate
         })
      });

      process.stdout.write("\x1b[2J\x1b[3J\x1b[H"); // Clean state

      const { waitUntilExit } = render(
        React.createElement(MasterLayoutWrapper, { workspaceDeps })
      );

      await waitUntilExit();
    });
}
