export type CommandDef = {
  name: string;
  aliases?: string[];
  description: string;
};

export const desirePathCommands: CommandDef[] = [
  { name: "send", description: "Send an email (alias for 'gmail send')" },
  { name: "ls", aliases: ["list"], description: "List Drive files (alias for 'drive ls')" },
  { name: "search", aliases: ["find"], description: "Search Drive files (alias for 'drive search')" },
  { name: "open", aliases: ["browse"], description: "Print a best-effort web URL for a Google URL/ID" },
  { name: "download", aliases: ["dl"], description: "Download a Drive file (alias for 'drive download')" },
  { name: "upload", aliases: ["up", "put"], description: "Upload a file to Drive (alias for 'drive upload')" },
  { name: "login", description: "Authorize and store a refresh token (alias for 'auth add')" },
  { name: "logout", description: "Remove a stored refresh token (alias for 'auth logout')" },
  { name: "status", aliases: ["st"], description: "Show auth/config status (alias for 'auth status')" },
  { name: "me", description: "Show your profile (alias for 'people me')" },
  { name: "whoami", aliases: ["who-am-i"], description: "Show your profile (alias for 'people me')" },
];

export const serviceCommands: CommandDef[] = [
  { name: "auth", description: "Auth and credentials" },
  { name: "groups", aliases: ["group"], description: "Google Groups" },
  { name: "workspace", aliases: ["ws"], description: "Google Workspace admin" },
  { name: "drive", aliases: ["drv"], description: "Google Drive" },
  { name: "docs", aliases: ["doc"], description: "Google Docs (export via Drive)" },
  { name: "slides", aliases: ["slide"], description: "Google Slides" },
  { name: "calendar", aliases: ["cal"], description: "Google Calendar" },
  { name: "classroom", aliases: ["class"], description: "Google Classroom" },
  { name: "time", description: "Local time utilities" },
  { name: "gmail", aliases: ["mail", "email"], description: "Gmail" },
  { name: "chat", description: "Google Chat" },
  { name: "contacts", aliases: ["contact"], description: "Google Contacts" },
  { name: "tasks", aliases: ["task"], description: "Google Tasks" },
  { name: "people", aliases: ["person"], description: "Google People" },
  { name: "keep", description: "Google Keep (Workspace only)" },
  { name: "sheets", aliases: ["sheet"], description: "Google Sheets" },
  { name: "forms", aliases: ["form"], description: "Google Forms" },
  { name: "appscript", aliases: ["script", "apps-script"], description: "Google Apps Script" },
  { name: "config", description: "Manage configuration" },
  { name: "exit-codes", aliases: ["exitcodes"], description: "Print stable exit codes" },
  { name: "agent", description: "Agent-friendly helpers" },
  { name: "schema", aliases: ["help-json", "helpjson"], description: "Machine-readable command schema" },
  { name: "version", description: "Print version" },
  { name: "completion", description: "Generate shell completion scripts" },
];
