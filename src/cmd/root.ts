import { Command } from "commander";

import { VERSION } from "../index.js";
import {
  executeAuthAdd,
  executeAuthRemove,
  executeAuthStatus,
  registerAuthCommands,
  resolveAuthCommandDeps,
  type AuthAddCommandOptions,
  type AuthCommandDeps,
} from "./auth/commands.js";
import { buildAuthCommandDeps } from "./auth/runtime.js";
import { registerAgentCommands } from "./agent/commands.js";
import { registerCalendarCommands } from "./calendar/commands.js";
import { registerChatCommands } from "./chat/commands.js";
import { registerClassroomCommands } from "./classroom/commands.js";
import { registerConfigCommands } from "./config/commands.js";
import { registerContactsCommands } from "./contacts/commands.js";
import { registerDocsCommands } from "./docs/commands.js";
import { formatDriveFiles, registerDriveCommands } from "./drive/commands.js";
import { registerFormsCommands } from "./forms/commands.js";
import { registerGmailCommands } from "./gmail/commands.js";
import { registerGroupsCommands } from "./groups/commands.js";
import { registerKeepCommands } from "./keep/commands.js";
import { registerPeopleCommands } from "./people/commands.js";
import { registerCompletionCommands } from "./completion/commands.js";
import { registerSchemaCommands } from "./schema/commands.js";
import { registerSheetsCommands } from "./sheets/commands.js";
import { registerSlidesCommands } from "./slides/commands.js";
import { registerTasksCommands } from "./tasks/commands.js";
import { registerAppScriptCommands } from "./appscript/commands.js";
import { registerTimeCommands } from "./time/commands.js";
import { registerExitCodesCommands } from "./exit-codes/commands.js";
import { registerVersionCommands } from "./version/commands.js";
import { desirePathCommands, serviceCommands } from "./command-registry.js";
import { buildExecutionContext, type RootOptions } from "./execution-context.js";
import { ServiceRuntime, type ServiceRuntimeOptions } from "../googleapi/auth-factory.js";
import { KeyringStore, EncryptedFileBackend } from "../secrets/store.js";
import { credentialsEncPath } from "../config/paths.js";
import { buildGmailCommandDeps, buildGmailDraftDeps, buildGmailThreadDeps, buildGmailLabelDeps, buildGmailFilterDeps, buildGmailSignatureDeps } from "./gmail/runtime.js";
import { buildCalendarCommandDeps } from "./calendar/runtime.js";
import { buildDriveCommandDeps } from "./drive/runtime.js";
import { buildDocsCommandDeps } from "./docs/runtime.js";
import { buildSheetsCommandDeps } from "./sheets/runtime.js";
import { buildSlidesCommandDeps } from "./slides/runtime.js";
import { buildPeopleCommandDeps } from "./people/runtime.js";
import { buildTasksCommandDeps } from "./tasks/runtime.js";
import { buildFormsCommandDeps } from "./forms/runtime.js";
import { buildChatCommandDeps } from "./chat/runtime.js";
import { buildClassroomCommandDeps } from "./classroom/runtime.js";
import { buildContactsCommandDeps } from "./contacts/runtime.js";
import { buildGroupsCommandDeps } from "./groups/runtime.js";
import { buildKeepCommandDeps } from "./keep/runtime.js";
import { buildAppScriptCommandDeps } from "./appscript/runtime.js";
import { registerWorkspaceCommands } from "./workspace/commands.js";
import { buildWorkspaceUserCommandDeps, buildWorkspaceGroupCommandDeps, buildWorkspaceDeviceCommandDeps, buildWorkspaceReportCommandDeps } from "./workspace/runtime.js";

type BuildProgramOptions = {
  authDeps?: AuthCommandDeps;
  serviceRuntimeOptions?: ServiceRuntimeOptions;
};

export function buildProgram(options: BuildProgramOptions = {}): Command {
  const program = new Command();
  const authDeps = resolveAuthCommandDeps(options.authDeps ?? buildAuthCommandDeps());

  // Mutable context holder — updated by Commander's preAction hook so that
  // service runtime deps can read the current --account / --client flags.
  const currentContext = { account: "", clientOverride: "", serviceAccount: "", impersonate: "" };

  const store = new KeyringStore(new EncryptedFileBackend(credentialsEncPath()));
  const runtimeOptions: ServiceRuntimeOptions = options.serviceRuntimeOptions ?? {
    resolveAccount: async () => {
      const sa = currentContext.serviceAccount;
      const impersonate = currentContext.impersonate;

      // If --account was passed, use it (could still have --sa for SA mode).
      if (currentContext.account !== "") {
        return {
          email: currentContext.account,
          clientOverride: currentContext.clientOverride,
          serviceAccount: sa || undefined,
          impersonate: impersonate || undefined,
        };
      }

      // If --sa was passed without --account, use SA as the identity.
      if (sa !== "") {
        return {
          email: sa,
          clientOverride: currentContext.clientOverride,
          serviceAccount: sa,
          impersonate: impersonate || undefined,
        };
      }

      // Fall back to default user account.
      const defaultEmail = await store.getDefaultAccount("default");
      if (defaultEmail !== "") {
        return { email: defaultEmail, clientOverride: currentContext.clientOverride };
      }

      // Fall back to first available token.
      const tokens = await store.listTokens();
      const first = tokens[0];
      if (first !== undefined) {
        return { email: first.email, clientOverride: currentContext.clientOverride };
      }

      // Fall back to default service account.
      const defaultSa = await store.getDefaultServiceAccount();
      if (defaultSa !== "") {
        return {
          email: defaultSa,
          clientOverride: currentContext.clientOverride,
          serviceAccount: defaultSa,
        };
      }

      return { email: "", clientOverride: currentContext.clientOverride };
    },
  };
  const runtime = new ServiceRuntime(runtimeOptions);

  // Build all service deps upfront — they resolve auth lazily when called.
  const gmailDeps = {
    ...buildGmailCommandDeps(runtimeOptions),
    ...buildGmailDraftDeps(runtimeOptions),
    ...buildGmailThreadDeps(runtimeOptions),
    ...buildGmailLabelDeps(runtimeOptions),
    ...buildGmailFilterDeps(runtimeOptions),
    ...buildGmailSignatureDeps(runtimeOptions),
  };
  const calendarDeps = buildCalendarCommandDeps(runtimeOptions);
  const chatDeps = buildChatCommandDeps(runtimeOptions);
  const classroomDeps = buildClassroomCommandDeps(runtimeOptions);
  const contactsDeps = buildContactsCommandDeps(runtimeOptions);
  const groupsDeps = buildGroupsCommandDeps(runtimeOptions);
  const keepDeps = buildKeepCommandDeps(runtimeOptions);
  const workspaceUserDeps = buildWorkspaceUserCommandDeps(runtimeOptions);
  const workspaceGroupDeps = buildWorkspaceGroupCommandDeps(runtimeOptions);
  const workspaceDeviceDeps = buildWorkspaceDeviceCommandDeps(runtimeOptions);
  const workspaceReportDeps = buildWorkspaceReportCommandDeps(runtimeOptions);
  const workspaceDeps = { ...workspaceUserDeps, ...workspaceGroupDeps, ...workspaceDeviceDeps, ...workspaceReportDeps };
  const driveDeps = buildDriveCommandDeps(runtime);
  const docsDeps = buildDocsCommandDeps(runtime);
  const sheetsDeps = buildSheetsCommandDeps(runtime);
  const slidesDeps = buildSlidesCommandDeps(runtime);
  const peopleDeps = buildPeopleCommandDeps(runtime);
  const tasksDeps = buildTasksCommandDeps(runtime);
  const formsDeps = buildFormsCommandDeps(runtime);
  const appscriptDeps = buildAppScriptCommandDeps(runtime);

  program
    .name("typee")
    .description(
      "Google CLI for Gmail/Calendar/Chat/Classroom/Drive/Contacts/Tasks/Sheets/Docs/Slides/People/Forms/App Script",
    )
    .version(VERSION);

  program
    .option("--color <mode>", "Color output: auto|always|never", "auto")
    .option("-a, --account <email>", "Account email for API commands")
    .option("--client <name>", "OAuth client name")
    .option("--enable-commands <list>", "Comma-separated list of enabled top-level commands")
    .option("-j, --json", "Output JSON to stdout (best for scripting)", false)
    .option("-p, --plain", "Output stable, parseable text to stdout (TSV; no colors)", false)
    .option("--results-only", "In JSON mode, emit only the primary result", false)
    .option("--select <fields>", "In JSON mode, select comma-separated fields")
    .option("-n, --dry-run", "Do not make changes; print intended actions and exit successfully", false)
    .option("-y, --force", "Skip confirmations for destructive commands", false)
    .option("--no-input", "Never prompt; fail instead (useful for CI)", false)
    .option("-v, --verbose", "Enable verbose logging", false)
    .option("--sa <email>", "Use service account instead of user OAuth")
    .option("--impersonate <email>", "Impersonate user via domain-wide delegation");

  // Capture --account and --client before every command action so that
  // the AccountResolver in service runtimes can read them.
  program.hook("preAction", (thisCommand: Command) => {
    const rootOpts = thisCommand.opts() as RootOptions;
    currentContext.account = (rootOpts.account ?? "").trim();
    currentContext.clientOverride = (rootOpts.client ?? "").trim();
    currentContext.serviceAccount = (rootOpts.sa ?? "").trim();
    currentContext.impersonate = (rootOpts.impersonate ?? "").trim();
  });

  for (const def of [...desirePathCommands, ...serviceCommands]) {
    const cmd = program.command(def.name).description(def.description);
    for (const alias of def.aliases ?? []) {
      cmd.alias(alias);
    }

    if (def.name === "login") {
      cmd
        .requiredOption("--email <email>", "Account email")
        .option("--auth-url <url>", "OAuth redirect URL (manual flow)")
        .option("--auth-code <code>", "OAuth authorization code (manual flow)")
        .option("--force-consent", "Force consent prompt", false)
        .option("--manual", "Browserless auth flow")
        .option("--remote", "Remote-friendly manual auth flow")
        .option("--step <number>", "Remote auth step: 1=print URL, 2=exchange code", (value) => Number.parseInt(value, 10))
        .action(async function actionLogin(this: Command) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const opts = this.opts<AuthAddCommandOptions>();
          await executeAuthAdd(rootOptions, opts, authDeps);
        });
      continue;
    }

    if (def.name === "send") {
      cmd
        .requiredOption("--to <email>", "Recipient email")
        .requiredOption("--subject <subject>", "Email subject")
        .requiredOption("--body <body>", "Email body")
        .action(async function actionSend(this: Command) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const ctx = buildExecutionContext(rootOptions);
          const result = await gmailDeps.sendEmail({
            to: (this.opts() as { to: string }).to,
            subject: (this.opts() as { subject: string }).subject,
            body: (this.opts() as { body: string }).body,
          });

          if (ctx.output.mode === "json") {
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
            return;
          }

          process.stdout.write(result.accepted ? `Message sent (id=${result.id || "unknown"})\n` : "Message was not accepted by Gmail\n");
        });
      continue;
    }

    if (def.name === "ls") {
      cmd.action(async function actionLs(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const ctx = buildExecutionContext(rootOptions);
        const files = await driveDeps.listFiles();
        process.stdout.write(`${formatDriveFiles(files, ctx.output.mode)}\n`);
      });
      continue;
    }

    if (def.name === "logout") {
      cmd.requiredOption("--email <email>", "Account email").action(async function actionLogout(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const opts = this.opts<{ email: string }>();
        await executeAuthRemove(rootOptions, opts.email, authDeps);
      });
      continue;
    }

    if (def.name === "status") {
      cmd.action(async function actionStatus(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        await executeAuthStatus(rootOptions, authDeps);
      });
      continue;
    }

    if (def.name === "me" || def.name === "whoami") {
      cmd.action(async function actionMe(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const ctx = buildExecutionContext(rootOptions);
        const profile = await peopleDeps.me();
        if (ctx.output.mode === "json") {
          process.stdout.write(`${JSON.stringify(profile, null, 2)}\n`);
          return;
        }
        process.stdout.write(`${profile.displayName}\n`);
      });
      continue;
    }

    if (def.name === "auth") {
      registerAuthCommands(cmd, authDeps);
      continue;
    }

    if (def.name === "gmail") {
      registerGmailCommands(cmd, gmailDeps);
      continue;
    }

    if (def.name === "calendar") {
      registerCalendarCommands(cmd, calendarDeps);
      continue;
    }

    if (def.name === "drive") {
      registerDriveCommands(cmd, driveDeps);
      continue;
    }

    if (def.name === "docs") {
      registerDocsCommands(cmd, docsDeps);
      continue;
    }

    if (def.name === "slides") {
      registerSlidesCommands(cmd, slidesDeps);
      continue;
    }

    if (def.name === "sheets") {
      registerSheetsCommands(cmd, sheetsDeps);
      continue;
    }

    if (def.name === "forms") {
      registerFormsCommands(cmd, formsDeps);
      continue;
    }

    if (def.name === "tasks") {
      registerTasksCommands(cmd, tasksDeps);
      continue;
    }

    if (def.name === "people") {
      registerPeopleCommands(cmd, peopleDeps);
      continue;
    }

    if (def.name === "chat") {
      registerChatCommands(cmd, chatDeps);
      continue;
    }

    if (def.name === "classroom") {
      registerClassroomCommands(cmd, classroomDeps);
      continue;
    }

    if (def.name === "contacts") {
      registerContactsCommands(cmd, contactsDeps);
      continue;
    }

    if (def.name === "groups") {
      registerGroupsCommands(cmd, groupsDeps);
      continue;
    }

    if (def.name === "keep") {
      registerKeepCommands(cmd, keepDeps);
      continue;
    }

    if (def.name === "workspace") {
      registerWorkspaceCommands(cmd, workspaceDeps);
      continue;
    }

    if (def.name === "appscript") {
      registerAppScriptCommands(cmd, appscriptDeps);
      continue;
    }

    if (def.name === "time") {
      registerTimeCommands(cmd);
      continue;
    }

    if (def.name === "config") {
      registerConfigCommands(cmd);
      continue;
    }

    if (def.name === "exit-codes") {
      registerExitCodesCommands(cmd);
      continue;
    }

    if (def.name === "version") {
      registerVersionCommands(cmd);
      continue;
    }

    if (def.name === "schema") {
      registerSchemaCommands(cmd);
      continue;
    }

    if (def.name === "completion") {
      registerCompletionCommands(cmd);
      continue;
    }

    if (def.name === "agent") {
      registerAgentCommands(cmd);
      continue;
    }

    cmd.action(() => {
      const rootOptions = program.opts<RootOptions>();
      const context = buildExecutionContext(rootOptions);
      throw new Error(
        `Command '${def.name}' is not implemented yet in the TypeScript port (mode=${context.output.mode}).`,
      );
    });
  }

  return program;
}
