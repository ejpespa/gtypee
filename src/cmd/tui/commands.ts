import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { MasterLayout } from "./MasterLayout.js";
import { type RootOptions } from "../execution-context.js";
import {
  buildWorkspaceDeviceCommandDeps,
  buildWorkspaceGroupCommandDeps,
  buildWorkspaceOrgUnitCommandDeps,
  buildWorkspaceReportCommandDeps,
  buildWorkspaceUserCommandDeps,
} from "../workspace/runtime.js";
import { resolveDefaultAccount } from "../auth/commands.js";

export function registerTuiCommand(root: Command): void {
  root
    .command("tui")
    .description("Launch the interactive gtypee Master Dashboard")
    .action(async function (this: Command) {
      const rootOptions = this.optsWithGlobals() as RootOptions;

      const resolved = await resolveDefaultAccount({
        account: rootOptions.account,
        clientOverride: rootOptions.client,
        serviceAccount: rootOptions.sa,
        impersonate: rootOptions.impersonate,
      });

      const reportDeps = buildWorkspaceReportCommandDeps({
        resolveAccount: async () => resolved,
      });

      const userDeps = buildWorkspaceUserCommandDeps({
        resolveAccount: async () => resolved,
      });

      const deviceDeps = buildWorkspaceDeviceCommandDeps({
        resolveAccount: async () => resolved,
      });

      const groupDeps = buildWorkspaceGroupCommandDeps({
        resolveAccount: async () => resolved,
      });

      const orgDeps = buildWorkspaceOrgUnitCommandDeps({
        resolveAccount: async () => resolved,
      });

      process.stdout.write("\x1b[2J\x1b[3J\x1b[H"); // clear the screen

      const { waitUntilExit } = render(
        React.createElement(MasterLayout, { deps: { reportDeps, userDeps, deviceDeps, groupDeps, orgDeps } })
      );

      await waitUntilExit();
    });
}
