import { fromFlags, type JsonTransform, type OutputMode } from "../outfmt/outfmt.js";

export type RootOptions = {
  account?: string;
  client?: string;
  sa?: string;
  impersonate?: string;
  color?: string;
  json?: boolean;
  plain?: boolean;
  resultsOnly?: boolean;
  select?: string;
  dryRun?: boolean;
  force?: boolean;
  noInput?: boolean;
  verbose?: boolean;
  enableCommands?: string;
};

export type ExecutionContext = {
  account: string;
  clientOverride: string;
  color: string;
  verbose: boolean;
  dryRun: boolean;
  force: boolean;
  noInput: boolean;
  enableCommands: string[];
  output: {
    mode: OutputMode;
    transform: JsonTransform;
  };
};

function splitCommaList(value: string | undefined): string[] {
  if ((value ?? "").trim() === "") {
    return [];
  }

  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function buildExecutionContext(options: RootOptions): ExecutionContext {
  const mode = fromFlags(options.json ?? false, options.plain ?? false);
  return {
    account: (options.account ?? "").trim(),
    clientOverride: (options.client ?? "").trim(),
    color: (options.color ?? "auto").trim(),
    verbose: options.verbose ?? false,
    dryRun: options.dryRun ?? false,
    force: options.force ?? false,
    noInput: options.noInput ?? false,
    enableCommands: splitCommaList(options.enableCommands),
    output: {
      mode,
      transform: {
        resultsOnly: options.resultsOnly ?? false,
        select: splitCommaList(options.select),
      },
    },
  };
}
