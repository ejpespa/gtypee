export type Service =
  | "gmail"
  | "calendar"
  | "chat"
  | "classroom"
  | "drive"
  | "docs"
  | "slides"
  | "contacts"
  | "tasks"
  | "people"
  | "sheets"
  | "forms"
  | "appscript"
  | "groups"
  | "workspace"
  | "keep";

const SCOPE_OPENID = "openid";
const SCOPE_EMAIL = "email";
const SCOPE_USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email";

export enum DriveScopeMode {
  Full = "full",
  Readonly = "readonly",
  File = "file",
}

export type ScopeOptions = {
  readonly?: boolean;
  driveScope?: DriveScopeMode;
};

type ServiceInfoInternal = {
  scopes: string[];
  user: boolean;
  apis: string[];
  note?: string;
};

const serviceOrder: Service[] = [
  "gmail",
  "calendar",
  "chat",
  "classroom",
  "drive",
  "docs",
  "slides",
  "contacts",
  "tasks",
  "sheets",
  "people",
  "forms",
  "appscript",
  "groups",
  "keep",
];

const serviceInfoByService: Record<Service, ServiceInfoInternal> = {
  gmail: {
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.settings.basic",
      "https://www.googleapis.com/auth/gmail.settings.sharing",
    ],
    user: true,
    apis: ["Gmail API"],
  },
  calendar: {
    scopes: ["https://www.googleapis.com/auth/calendar"],
    user: true,
    apis: ["Calendar API"],
  },
  chat: {
    scopes: [
      "https://www.googleapis.com/auth/chat.spaces",
      "https://www.googleapis.com/auth/chat.messages",
      "https://www.googleapis.com/auth/chat.memberships",
      "https://www.googleapis.com/auth/chat.users.readstate.readonly",
    ],
    user: true,
    apis: ["Chat API"],
  },
  classroom: {
    scopes: [
      "https://www.googleapis.com/auth/classroom.courses",
      "https://www.googleapis.com/auth/classroom.rosters",
      "https://www.googleapis.com/auth/classroom.coursework.students",
      "https://www.googleapis.com/auth/classroom.coursework.me",
      "https://www.googleapis.com/auth/classroom.courseworkmaterials",
      "https://www.googleapis.com/auth/classroom.announcements",
      "https://www.googleapis.com/auth/classroom.topics",
      "https://www.googleapis.com/auth/classroom.guardianlinks.students",
      "https://www.googleapis.com/auth/classroom.profile.emails",
      "https://www.googleapis.com/auth/classroom.profile.photos",
    ],
    user: true,
    apis: ["Classroom API"],
  },
  drive: {
    scopes: ["https://www.googleapis.com/auth/drive"],
    user: true,
    apis: ["Drive API"],
  },
  docs: {
    scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
    user: true,
    apis: ["Docs API", "Drive API"],
    note: "Export/copy/create via Drive",
  },
  slides: {
    scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/presentations"],
    user: true,
    apis: ["Slides API", "Drive API"],
    note: "Create/edit presentations",
  },
  contacts: {
    scopes: [
      "https://www.googleapis.com/auth/contacts",
      "https://www.googleapis.com/auth/contacts.other.readonly",
      "https://www.googleapis.com/auth/directory.readonly",
    ],
    user: true,
    apis: ["People API"],
    note: "Contacts + other contacts + directory",
  },
  tasks: {
    scopes: ["https://www.googleapis.com/auth/tasks"],
    user: true,
    apis: ["Tasks API"],
  },
  people: {
    scopes: ["profile"],
    user: true,
    apis: ["People API"],
    note: "OIDC profile scope",
  },
  sheets: {
    scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"],
    user: true,
    apis: ["Sheets API", "Drive API"],
    note: "Export via Drive",
  },
  forms: {
    scopes: [
      "https://www.googleapis.com/auth/forms.body",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ],
    user: true,
    apis: ["Forms API"],
  },
  appscript: {
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/script.deployments",
      "https://www.googleapis.com/auth/script.processes",
    ],
    user: true,
    apis: ["Apps Script API", "Drive API"],
    note: "List scripts via Drive",
  },
  groups: {
    scopes: ["https://www.googleapis.com/auth/admin.directory.group"],
    user: false,
    apis: ["Admin SDK Directory API"],
    note: "Workspace only; requires Admin SDK directory_v1",
  },
  workspace: {
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.user",
      "https://www.googleapis.com/auth/admin.directory.user.security",
      "https://www.googleapis.com/auth/admin.directory.orgunit",
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.group.member",
      "https://www.googleapis.com/auth/admin.directory.device.chromeos",
      "https://www.googleapis.com/auth/admin.directory.device.mobile",
      "https://www.googleapis.com/auth/admin.reports.audit.readonly",
    ],
    user: false,
    apis: ["Admin SDK Directory API", "Admin SDK Reports API"],
    note: "Workspace admin: users, org units, groups, devices, reports",
  },
  keep: {
    scopes: ["https://www.googleapis.com/auth/keep.readonly"],
    user: false,
    apis: ["Keep API"],
    note: "Workspace only; service account (domain-wide delegation)",
  },
};

export function allServices(): Service[] {
  return [...serviceOrder];
}

export function parseService(raw: string): Service {
  const parsed = raw.trim().toLowerCase() as Service;
  if (parsed in serviceInfoByService) {
    return parsed;
  }
  throw new Error(`unknown service ${raw} (expected ${serviceNames(allServices(), "|")})`);
}

export function userServices(): Service[] {
  return serviceOrder.filter((service) => serviceInfoByService[service].user);
}

export function scopes(service: Service): string[] {
  const info = serviceInfoByService[service];
  if (!info) {
    throw new Error(`unknown service: ${service}`);
  }
  return [...info.scopes];
}

function driveScopeValue(opts: ScopeOptions): string {
  if (opts.readonly) {
    return "https://www.googleapis.com/auth/drive.readonly";
  }
  switch (opts.driveScope ?? DriveScopeMode.Full) {
    case DriveScopeMode.File:
      return "https://www.googleapis.com/auth/drive.file";
    case DriveScopeMode.Readonly:
      return "https://www.googleapis.com/auth/drive.readonly";
    case DriveScopeMode.Full:
      return "https://www.googleapis.com/auth/drive";
    default:
      throw new Error(`invalid drive scope ${String(opts.driveScope)} (expected full|readonly|file)`);
  }
}

function scopesForServiceWithOptions(service: Service, opts: ScopeOptions): string[] {
  const readonly = opts.readonly ?? false;
  switch (service) {
    case "gmail":
      return readonly ? ["https://www.googleapis.com/auth/gmail.readonly"] : scopes(service);
    case "calendar":
      return readonly ? ["https://www.googleapis.com/auth/calendar.readonly"] : scopes(service);
    case "chat":
      return readonly
        ? [
            "https://www.googleapis.com/auth/chat.spaces.readonly",
            "https://www.googleapis.com/auth/chat.messages.readonly",
            "https://www.googleapis.com/auth/chat.memberships.readonly",
            "https://www.googleapis.com/auth/chat.users.readstate.readonly",
          ]
        : scopes(service);
    case "classroom":
      return readonly
        ? [
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.rosters.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
            "https://www.googleapis.com/auth/classroom.announcements.readonly",
            "https://www.googleapis.com/auth/classroom.topics.readonly",
            "https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly",
            "https://www.googleapis.com/auth/classroom.profile.emails",
            "https://www.googleapis.com/auth/classroom.profile.photos",
          ]
        : scopes(service);
    case "drive":
      return [driveScopeValue(opts)];
    case "docs":
      return [
        driveScopeValue(opts),
        readonly
          ? "https://www.googleapis.com/auth/documents.readonly"
          : "https://www.googleapis.com/auth/documents",
      ];
    case "slides":
      return [
        driveScopeValue(opts),
        readonly
          ? "https://www.googleapis.com/auth/presentations.readonly"
          : "https://www.googleapis.com/auth/presentations",
      ];
    case "contacts":
      return [
        readonly ? "https://www.googleapis.com/auth/contacts.readonly" : "https://www.googleapis.com/auth/contacts",
        "https://www.googleapis.com/auth/contacts.other.readonly",
        "https://www.googleapis.com/auth/directory.readonly",
      ];
    case "tasks":
      return readonly ? ["https://www.googleapis.com/auth/tasks.readonly"] : scopes(service);
    case "people":
      return scopes(service);
    case "sheets":
      return [
        driveScopeValue(opts),
        readonly
          ? "https://www.googleapis.com/auth/spreadsheets.readonly"
          : "https://www.googleapis.com/auth/spreadsheets",
      ];
    case "forms":
      return [
        readonly
          ? "https://www.googleapis.com/auth/forms.body.readonly"
          : "https://www.googleapis.com/auth/forms.body",
        "https://www.googleapis.com/auth/forms.responses.readonly",
      ];
    case "appscript":
      return readonly
        ? [
            "https://www.googleapis.com/auth/script.projects.readonly",
            "https://www.googleapis.com/auth/script.deployments.readonly",
          ]
        : scopes(service);
    case "groups":
    case "keep":
      return scopes(service);
    default:
      throw new Error(`unknown service: ${service}`);
  }
}

function mergeScopes(baseScopes: string[], extras: string[]): string[] {
  const set = new Set<string>();
  for (const scope of [...baseScopes, ...extras]) {
    if (scope.trim() !== "") {
      set.add(scope);
    }
  }
  return [...set].sort();
}

export function scopesForServices(services: Service[]): string[] {
  const set = new Set<string>();
  for (const service of services) {
    for (const scope of scopes(service)) {
      set.add(scope);
    }
  }
  return [...set].sort();
}

export function scopesForManage(services: Service[]): string[] {
  return mergeScopes(scopesForServices(services), [SCOPE_OPENID, SCOPE_EMAIL, SCOPE_USERINFO_EMAIL]);
}

export function scopesForManageWithOptions(services: Service[], opts: ScopeOptions): string[] {
  const set = new Set<string>();
  for (const service of services) {
    for (const scope of scopesForServiceWithOptions(service, opts)) {
      set.add(scope);
    }
  }
  return mergeScopes([...set], [SCOPE_OPENID, SCOPE_EMAIL, SCOPE_USERINFO_EMAIL]);
}

export type ServiceInfo = {
  service: Service;
  user: boolean;
  scopes: string[];
  apis: string[];
  note?: string;
};

export function servicesInfo(): ServiceInfo[] {
  return serviceOrder.map((service) => {
    const info = serviceInfoByService[service];
    const out: ServiceInfo = {
      service,
      user: info.user,
      scopes: [...info.scopes],
      apis: [...info.apis],
    };
    if (info.note !== undefined) {
      out.note = info.note;
    }
    return out;
  });
}

export function servicesMarkdown(infos: ServiceInfo[]): string {
  if (infos.length === 0) {
    return "";
  }
  const lines = [
    "| Service | User | APIs | Scopes | Notes |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const info of infos) {
    lines.push(
      `| ${info.service} | ${info.user ? "yes" : "no"} | ${info.apis.join(", ")} | ${info.scopes
        .map((scope) => `\`${scope}\``)
        .join("<br>")} | ${info.note ?? ""} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function userServiceCSV(): string {
  return serviceNames(userServices(), ",");
}

function serviceNames(services: Service[], sep: string): string {
  return services.join(sep);
}
