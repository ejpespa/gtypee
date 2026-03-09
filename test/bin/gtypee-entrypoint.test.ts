import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveScriptPath } from "../../src/cmd/script-path.js";

const packageJsonPath = new URL("../../package.json", import.meta.url);

describe("gtypee entrypoint packaging", () => {
  it("exposes only the gtypee bin in package.json", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin).toEqual({
      gtypee: "dist/bin/gtypee.js",
    });
  });

  it("uses gtypee as fallback script name", () => {
    expect(resolveScriptPath(["node"])).toBe("gtypee");
    expect(resolveScriptPath(["node", "dist/bin/gtypee.js"])).toBe("dist/bin/gtypee.js");
  });
});
