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
import { normalizeDriveSearchQuery, resolveDriveDownloadPath } from "../googleapi/drive.js";
import { writeJson } from "../outfmt/outfmt.js";
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
import { registerHealthCheckCommands } from "./health-check/commands.js";
import { buildHealthCheckDeps } from "./health-check/runtime.js";
import { registerVersionCommands } from "./version/commands.js";
import { desirePathCommands, serviceCommands } from "./command-registry.js";
import { buildExecutionContext, type RootOptions } from "./execution-context.js";
import { ServiceRuntime, type ServiceRuntimeOptions } from "../googleapi/auth-factory.js";
import { KeyringStore, EncryptedFileBackend } from "../secrets/store.js";
import { credentialsEncPath } from "../config/paths.js";
import { buildGmailCommandDeps, buildGmailDraftDeps, buildGmailThreadDeps, buildGmailLabelDeps, buildGmailFilterDeps, buildGmailSignatureDeps, buildGmailSendersDeps, buildGmailAttachmentDeps, buildGmailSettingsDeps } from "./gmail/runtime.js";
import { buildCalendarCommandDeps } from "./calendar/runtime.js";
import { buildCalendarFreeBusyDeps, buildCalendarListDeps, buildCalendarAclDeps } from "./calendar/runtime.js";
import { buildDriveCommandDeps } from "./drive/runtime.js";
import { buildDriveQuotaDeps, buildDriveTrashDeps, buildDriveSharedDrivesDeps } from "./drive/runtime.js";
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
import { registerMeetCommands } from "./meet/commands.js";
import { buildMeetCommandDeps } from "./meet/runtime.js";
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

      // If --impersonate was passed without --sa, use default service account with impersonation.
      if (impersonate !== "") {
        const defaultSa = await store.getDefaultServiceAccount();
        if (defaultSa !== "") {
          return {
            email: defaultSa,
            clientOverride: currentContext.clientOverride,
            serviceAccount: defaultSa,
            impersonate: impersonate,
          };
        }
        // No default SA configured, fall through to error
        return { email: "", clientOverride: currentContext.clientOverride };
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
    ...buildGmailSendersDeps(runtimeOptions),
    ...buildGmailAttachmentDeps(runtimeOptions),
    ...buildGmailSettingsDeps(runtimeOptions),
  };
  const calendarDeps = {
    ...buildCalendarCommandDeps(runtimeOptions),
    ...buildCalendarFreeBusyDeps(runtimeOptions),
    ...buildCalendarListDeps(runtimeOptions),
    ...buildCalendarAclDeps(runtimeOptions),
  };
  const chatDeps = buildChatCommandDeps(runtimeOptions);
  const classroomDeps = buildClassroomCommandDeps(runtimeOptions);
  const contactsDeps = buildContactsCommandDeps(runtimeOptions);
  const groupsDeps = buildGroupsCommandDeps(runtimeOptions);
  const keepDeps = buildKeepCommandDeps(runtimeOptions);
  const meetDeps = buildMeetCommandDeps(runtimeOptions);
  const healthCheckDeps = buildHealthCheckDeps(runtimeOptions);
  const workspaceUserDeps = buildWorkspaceUserCommandDeps(runtimeOptions);
  const workspaceGroupDeps = buildWorkspaceGroupCommandDeps(runtimeOptions);
  const workspaceDeviceDeps = buildWorkspaceDeviceCommandDeps(runtimeOptions);
  const workspaceReportDeps = buildWorkspaceReportCommandDeps(runtimeOptions);
  const workspaceDeps = { ...workspaceUserDeps, ...workspaceGroupDeps, ...workspaceDeviceDeps, ...workspaceReportDeps };
  const driveDeps = {
    ...buildDriveCommandDeps(runtime),
    ...buildDriveQuotaDeps(runtime),
    ...buildDriveTrashDeps(runtime),
    ...buildDriveSharedDrivesDeps(runtime),
  };
  const docsDeps = buildDocsCommandDeps(runtime);
  const sheetsDeps = buildSheetsCommandDeps(runtime);
  const slidesDeps = buildSlidesCommandDeps(runtime);
  const peopleDeps = buildPeopleCommandDeps(runtime);
  const tasksDeps = buildTasksCommandDeps(runtime);
  const formsDeps = buildFormsCommandDeps(runtime);
  const appscriptDeps = buildAppScriptCommandDeps(runtime);

  program
    .name("gtypee")
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
    .option("-c, --csv", "Output CSV to stdout", false)
    .option("--results-only", "In JSON mode, emit only the primary result", false)
    .option("--select <fields>", "In JSON mode, select comma-separated fields")
    .option("-n, --dry-run", "Do not make changes; print intended actions and exit successfully", false)
    .option("-y, --force", "Skip confirmations for destructive commands", false)
    .option("--no-input", "Never prompt; fail instead (useful for CI)", false)
    .option("-v, --verbose", "Enable verbose logging", false)
    .option("-q, --quiet", "Suppress non-data output (useful for CI)", false)
    .option("--timeout <seconds>", "Command timeout in seconds (exit code 5 on expiry)")
    .option("--fail-on-empty", "Exit with code 7 when a list command returns no results", false)
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
        })
        .addHelpText("after", "\nExamples:\n  gtypee login --email user@example.com\n  gtypee login --email user@example.com --manual\n  gtypee login --email user@example.com --remote --step 1");
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
            writeJson(result, ctx.output.transform);
            return;
          }

          process.stdout.write(result.accepted ? `Message sent (id=${result.id || "unknown"})\n` : "Message was not accepted by Gmail\n");
        })
        .addHelpText("after", "\nExamples:\n  gtypee send --to bob@example.com --subject \"Hello\" --body \"Hi there\"\n  gtypee send --to bob@example.com --subject \"Report\" --body \"See attached\" --json");
      continue;
    }

    if (def.name === "ls") {
      cmd.action(async function actionLs(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const ctx = buildExecutionContext(rootOptions);
        const files = await driveDeps.listFiles();
        process.stdout.write(`${formatDriveFiles(files, ctx.output.mode)}\n`);
      })
        .addHelpText("after", "\nExamples:\n  gtypee ls\n  gtypee ls --json");
      continue;
    }

    if (def.name === "logout") {
      cmd.requiredOption("--email <email>", "Account email").action(async function actionLogout(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const opts = this.opts<{ email: string }>();
        await executeAuthRemove(rootOptions, opts.email, authDeps);
      })
        .addHelpText("after", "\nExamples:\n  gtypee logout --email user@example.com");
      continue;
    }

    if (def.name === "status") {
      cmd.action(async function actionStatus(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        await executeAuthStatus(rootOptions, authDeps);
      })
        .addHelpText("after", "\nExamples:\n  gtypee status\n  gtypee status --json");
      continue;
    }

    if (def.name === "me" || def.name === "whoami") {
      cmd.action(async function actionMe(this: Command) {
        const rootOptions = this.optsWithGlobals() as RootOptions;
        const ctx = buildExecutionContext(rootOptions);
        const profile = await peopleDeps.me();
        if (ctx.output.mode === "json") {
          writeJson(profile, ctx.output.transform);
          return;
        }
        process.stdout.write(`${profile.displayName}\n`);
      })
        .addHelpText("after", "\nExamples:\n  gtypee whoami\n  gtypee me --json");
      continue;
    }

    if (def.name === "search") {
      cmd
        .requiredOption("--query <query>", "Drive search query")
        .option("--page-size <number>", "Number of files per page", parseInt)
        .option("--page-token <token>", "Token for the next page")
        .action(async function actionSearch(this: Command) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const ctx = buildExecutionContext(rootOptions);
          const opts = this.opts<{ query: string; pageSize?: number; pageToken?: string }>();
          const paginationOpts: import("../types/pagination.js").PaginationOptions = {};
          if (opts.pageSize !== undefined) paginationOpts.pageSize = opts.pageSize;
          if (opts.pageToken !== undefined) paginationOpts.pageToken = opts.pageToken;
          const result = await driveDeps.searchFiles(normalizeDriveSearchQuery(opts.query), paginationOpts);
          if (ctx.output.mode === "json") {
            writeJson(result, ctx.output.transform);
            return;
          }
          process.stdout.write(`${formatDriveFiles(result, ctx.output.mode)}\n`);
        })
        .addHelpText("after", "\nExamples:\n  gtypee search --query \"quarterly report\"\n  gtypee search --query \"*.pdf\" --page-size 50 --json");
      continue;
    }

    if (def.name === "download") {
      cmd
        .requiredOption("--id <id>", "Drive file id")
        .option("--out <path>", "Output path")
        .action(async function actionDownload(this: Command) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const ctx = buildExecutionContext(rootOptions);
          const opts = this.opts<{ id: string; out?: string }>();
          const outputPath = resolveDriveDownloadPath(opts.id, opts.out);
          const result = await driveDeps.downloadFile(opts.id, outputPath);
          if (ctx.output.mode === "json") {
            writeJson(result, ctx.output.transform);
            return;
          }
          process.stdout.write(result.downloaded ? `Downloaded ${result.id} to ${result.path}\n` : `Download failed for ${result.id}\n`);
        })
        .addHelpText("after", "\nExamples:\n  gtypee download --id abc123\n  gtypee download --id abc123 --out ./report.pdf");
      continue;
    }

    if (def.name === "upload") {
      cmd
        .requiredOption("--path <path>", "Local file path")
        .action(async function actionUpload(this: Command) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const ctx = buildExecutionContext(rootOptions);
          const opts = this.opts<{ path: string }>();
          const result = await driveDeps.uploadFile(opts.path);
          if (ctx.output.mode === "json") {
            writeJson(result, ctx.output.transform);
            return;
          }
          process.stdout.write(result.uploaded ? `Uploaded ${opts.path} (id=${result.id || "unknown"})\n` : `Upload failed for ${opts.path}\n`);
        })
        .addHelpText("after", "\nExamples:\n  gtypee upload --path ./report.pdf\n  gtypee upload --path ./data.csv --json");
      continue;
    }

    if (def.name === "open") {
      cmd
        .argument("<id>", "Drive file ID or Google URL")
        .action(async function actionOpen(this: Command, id: string) {
          const rootOptions = this.optsWithGlobals() as RootOptions;
          const ctx = buildExecutionContext(rootOptions);
          const url = id.startsWith("http")
            ? id
            : `https://drive.google.com/file/d/${id}/view`;
          if (ctx.output.mode === "json") {
            writeJson({ id, url }, ctx.output.transform);
            return;
          }
          process.stdout.write(`${url}\n`);
        })
        .addHelpText("after", "\nExamples:\n  gtypee open abc123\n  gtypee open https://docs.google.com/document/d/abc123");
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

    if (def.name === "meet") {
      registerMeetCommands(cmd, meetDeps);
      cmd.addHelpText(
        "after",
        `\nExamples:\n  gtypee meet create\n  gtypee meet get --space spaces/abc123\n  gtypee meet end --space spaces/abc123\n`,
      );
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

    if (def.name === "health-check") {
      registerHealthCheckCommands(cmd, healthCheckDeps);
      cmd.addHelpText(
        "after",
        `\nExamples:\n  gtypee health-check run\n  gtypee health-check run --services gmail,drive\n  gtypee --json health-check run\n`,
      );
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
