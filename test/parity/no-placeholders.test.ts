import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const placeholderText = "not implemented yet in TypeScript port";
const featureStatusFile = path.join(process.cwd(), "docs", "plans", "features", "README.md");

const featureCommandRoots: Record<string, string[]> = {
  "core-cli": ["src/cmd/root.ts", "src/cmd/command-registry.ts", "src/cmd/rewrite-desire-path-args.ts", "src/cmd/execution-context.ts"],
  auth: ["src/cmd/auth"],
  gmail: ["src/cmd/gmail"],
  calendar: ["src/cmd/calendar"],
  drive: ["src/cmd/drive"],
  docs: ["src/cmd/docs"],
  sheets: ["src/cmd/sheets"],
  slides: ["src/cmd/slides"],
  chat: ["src/cmd/chat"],
  classroom: ["src/cmd/classroom"],
  contacts: ["src/cmd/contacts"],
  people: ["src/cmd/people"],
  tasks: ["src/cmd/tasks"],
  forms: ["src/cmd/forms"],
  keep: ["src/cmd/keep"],
  groups: ["src/cmd/groups"],
  appscript: ["src/cmd/appscript"],
};

function collectCommandFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCommandFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parityCompleteFeatures(): string[] {
  const statusSource = readFileSync(featureStatusFile, "utf8");
  const lines = statusSource.split(/\r?\n/);
  const parityComplete: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\|\s*([a-z-]+)\s*\|\s*([a-z-]+)\s*\|/);
    if (match === null || match[2] !== "parity-complete") {
      continue;
    }

    const feature = match[1];
    if (feature !== undefined) {
      parityComplete.push(feature);
    }
  }

  return parityComplete;
}

function filesForFeatures(features: string[]): string[] {
  const files: string[] = [];

  for (const feature of features) {
    const roots = featureCommandRoots[feature];
    if (roots === undefined) {
      throw new Error(`No command path mapping for feature '${feature}'`);
    }

    for (const root of roots) {
      const fullPath = path.join(process.cwd(), root);
      const stat = readdirSync(path.dirname(fullPath), { withFileTypes: true }).find((entry) => entry.name === path.basename(fullPath));

      if (!stat) {
        continue;
      }

      if (stat.isDirectory()) {
        files.push(...collectCommandFiles(fullPath));
      } else if (stat.isFile() && fullPath.endsWith(".ts")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

describe("parity placeholder guardrail", () => {
  it("has no placeholder text in parity-complete command implementations", () => {
    const files = filesForFeatures(parityCompleteFeatures());

    for (const filePath of files) {
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toContain(placeholderText);
    }
  });
});
