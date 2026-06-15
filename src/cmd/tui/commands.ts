import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { MasterLayoutWrapper } from "./MasterLayout.js";
import { buildExecutionContext, type RootOptions } from "../execution-context.js";
import { buildWorkspaceReportCommandDeps } from "../workspace/runtime.js";
import { resolveAuthCommandDeps, resolveDefaultAccount } from "../auth/commands.js";

export function registerTuiCommand(root: Command): void {
  root
    .command("tui")
    .description("Launch the interactive gtypee Master Dashboard")
    .action(async function (this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;
      
      const authDeps = resolveAuthCommandDeps();

      const workspaceDeps = buildWorkspaceReportCommandDeps({
         resolveAccount: async () => {
            const args: any = {};
            if (rootOptions.account !== undefined) args.account = rootOptions.account;
            if (rootOptions.client !== undefined) args.clientOverride = rootOptions.client;
            if (rootOptions.sa !== undefined) args.serviceAccount = rootOptions.sa;
            if (rootOptions.impersonate !== undefined) args.impersonate = rootOptions.impersonate;
            return resolveDefaultAccount(args);
         }
      });

      process.stdout.write("[2J[3J[H"); // Clean state
      
      const { waitUntilExit } = render(
        React.createElement(MasterLayoutWrapper, { workspaceDeps })
      );
      
      await waitUntilExit();
    });
}
