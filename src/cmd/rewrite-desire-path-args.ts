function globalFlagTakesValue(flag: string): boolean {
  switch (flag) {
    case "--color":
    case "--account":
    case "--acct":
    case "--client":
    case "--enable-commands":
    case "--select":
    case "--pick":
    case "--project":
    case "-a":
      return true;
    default:
      return false;
  }
}

function isCalendarEventsCommand(args: readonly string[]): boolean {
  const cmdTokens: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--") {
      break;
    }

    if (arg.startsWith("-")) {
      if (globalFlagTakesValue(arg) && i + 1 < args.length) {
        i += 1;
      }
      continue;
    }

    cmdTokens.push(arg.trim().toLowerCase());
    if (cmdTokens.length >= 2) {
      break;
    }
  }

  if (cmdTokens.length < 2) {
    return false;
  }

  const [cmd0, cmd1] = cmdTokens;
  if (cmd0 !== "calendar" && cmd0 !== "cal") {
    return false;
  }

  return cmd1 === "events" || cmd1 === "ls" || cmd1 === "list";
}

export function rewriteDesirePathArgs(args: readonly string[]): string[] {
  const keepFields = isCalendarEventsCommand(args);
  const out: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }

    if (arg === "--") {
      out.push(...args.slice(i));
      break;
    }

    if (keepFields) {
      out.push(arg);
      continue;
    }

    if (arg === "--fields") {
      out.push("--select");
      continue;
    }

    if (arg.startsWith("--fields=")) {
      out.push(`--select=${arg.slice("--fields=".length)}`);
      continue;
    }

    out.push(arg);
  }

  return out;
}
