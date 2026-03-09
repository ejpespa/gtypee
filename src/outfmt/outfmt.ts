export type OutputMode = "human" | "json" | "plain";

export type JsonTransform = {
  resultsOnly: boolean;
  select: string[];
};

export function fromFlags(json: boolean, plain: boolean): OutputMode {
  if (json && plain) {
    throw new Error("cannot combine --json and --plain");
  }
  if (json) {
    return "json";
  }
  if (plain) {
    return "plain";
  }
  return "human";
}

function getAtPath(value: unknown, dotPath: string): unknown {
  if (dotPath.trim() === "") {
    return undefined;
  }

  const parts = dotPath.split(".").filter((part) => part.trim() !== "");
  let cursor: unknown = value;
  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function setAtPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split(".").filter((part) => part.trim() !== "");
  if (parts.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (key === undefined) {
      return;
    }
    if (!(key in cursor) || typeof cursor[key] !== "object" || cursor[key] === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  if (leaf === undefined) {
    return;
  }
  cursor[leaf] = value;
}

export function applyJsonTransform(value: unknown, transform: JsonTransform): unknown {
  let current = value;

  if (transform.resultsOnly && typeof current === "object" && current !== null && "result" in current) {
    current = (current as Record<string, unknown>).result;
  }

  if (transform.select.length === 0) {
    return current;
  }

  const projected: Record<string, unknown> = {};
  for (const field of transform.select) {
    const resolved = getAtPath(current, field);
    if (resolved !== undefined) {
      setAtPath(projected, field, resolved);
    }
  }

  return projected;
}
