export function resolveScriptPath(argv: readonly string[]): string {
  return argv[1] ?? "gtypee";
}
