export type OutputMode = "human" | "json" | "plain" | "csv";

export type JsonTransform = {
  resultsOnly: boolean;
  select: string[];
};

export function fromFlags(json: boolean, plain: boolean, csv = false): OutputMode {
  const count = [json, plain, csv].filter(Boolean).length;
  if (count > 1) {
    throw new Error("cannot combine --json, --plain, and --csv");
  }
  if (json) {
    return "json";
  }
  if (plain) {
    return "plain";
  }
  if (csv) {
    return "csv";
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

export function writeJson(value: unknown, transform: JsonTransform): void {
  const transformed = applyJsonTransform(value, transform);
  process.stdout.write(`${JSON.stringify(transformed, null, 2)}\n`);
}

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function writeCsv(value: unknown): void {
  if (value === null || value === undefined || typeof value !== "object") {
    return;
  }

  const rows = Array.isArray(value) ? value : [value];
  if (rows.length === 0) {
    return;
  }

  const first = rows[0] as Record<string, unknown>;
  if (typeof first !== "object" || first === null) {
    return;
  }

  const headers = Object.keys(first);
  process.stdout.write(headers.map(escapeCsvField).join(",") + "\n");

  for (const row of rows) {
    const record = row as Record<string, unknown>;
    process.stdout.write(headers.map((h) => escapeCsvField(record[h])).join(",") + "\n");
  }
}
