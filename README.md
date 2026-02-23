<div align="center">
  <img src="logo.svg" alt="gtypee logo" width="200" height="200">

  # gtypee

  **TypeScript CLI for Google Workspace administration**

  [![npm version](https://img.shields.io/npm/v/gtypee.svg)](https://www.npmjs.com/package/gtypee)
  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  [![Node.js Version](https://img.shields.io/node/v/gtypee.svg)](https://nodejs.org)
  [![CI](https://github.com/ejpespa/gtypee/actions/workflows/ci.yml/badge.svg)](https://github.com/ejpespa/gtypee/actions/workflows/ci.yml)
  [![Release](https://github.com/ejpespa/gtypee/actions/workflows/release.yml/badge.svg)](https://github.com/ejpespa/gtypee/actions/workflows/release.yml)

**[📚 Documentation](https://gtypee.ejpespa.dev)** • **[🐛 Report Bug](https://github.com/ejpespa/gtypee/issues)** • **[✨ Request Feature](https://github.com/ejpespa/gtypee/issues)**
</div>

---

A powerful command-line interface for managing Gmail, Drive, Calendar, and 15+ Google services. Perfect for personal productivity, workspace administration, and automation scripts.

## Key Features

- **15+ Google Services** - Gmail, Drive, Calendar, Docs, Sheets, Slides, Tasks, Forms, Contacts, People, Chat, Classroom, Groups, Keep, and Apps Script
- **Two Auth Modes** - OAuth 2.0 for personal accounts, Service Account for workspace admin
- **JSON Output** - All commands support `--json` for scripting and automation
- **Workspace Admin** - Full user, group, and device management for Google Workspace domains
- **Beginner Friendly** - Intuitive commands with helpful examples

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Commands Reference](#commands-reference)
  - [Gmail](#gmail-commands)
  - [Drive](#drive-commands)
  - [Calendar](#calendar-commands)
  - [Workspace Admin](#workspace-admin-commands)
  - [Docs, Sheets, Slides](#docs-sheets-slides-commands)
  - [Other Services](#other-services)
- [Usage Scenarios](#usage-scenarios)
- [JSON Output](#json-output)
- [Configuration](#configuration)
- [Development](#development)
- [Contributing](#contributing)
- [Tips & Troubleshooting](#tips--troubleshooting)
- [License](#license)

---

## Installation

### From npm (recommended)

```bash
npm install -g gtypee
gtypee --help
```

### From source

```bash
git clone https://github.com/ejpespa/gtypee.git
cd gtypee
npm install
npm run build
npm link
gtypee --help
```

### Prerequisites

- Node.js 20+
- npm
- A Google Cloud project (free tier works)

---

## Quick Start

```bash
# Install from npm
npm install -g gtypee

# Set up authentication
gtypee auth add --email you@gmail.com

# Start using
gtypee gmail labels
gtypee drive ls
gtypee calendar events
gtypee people me
```

### Running from Source (Development)

If you cloned the repository for development:

```bash
# Install dependencies
npm install

# Build the project first!
npm run build

# Use the compiled version (RECOMMENDED for JSON output)
node dist/bin/gtypee.js --help

# Or use dev mode (NOT recommended for piping to jq)
npm run dev -- --help
```

> **Important:** When using `--json` output and piping to `jq` or other tools, **always use the compiled version** (`node dist/bin/gtypee.js`). The `npm run dev` command adds extra output that breaks JSON parsing.
>
> ```bash
> # WRONG - npm output will break jq
> npm run dev -- workspace user list --json | jq
>
> # CORRECT - use compiled version
> node dist/bin/gtypee.js workspace user list --json | jq '.[].primaryEmail'
> ```

---

## Authentication

gtypee supports two authentication modes:

### OAuth 2.0 (Personal Accounts)

For `@gmail.com` accounts and Workspace users accessing their own data.

**1. Create a Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., `gtypee`)
3. Go to **APIs & Services > OAuth consent screen**
4. Select **External** user type
5. Fill in required fields (App name: `gtypee`, your email)
6. Add your email as a **Test user**

**2. Enable APIs**

Enable the APIs you need in [APIs & Services > Library](https://console.cloud.google.com/apis/library):

| API | Services |
|-----|----------|
| Gmail API | `gmail` |
| Google Calendar API | `calendar` |
| Google Drive API | `drive`, `docs`, `sheets`, `slides` |
| Google Docs API | `docs` |
| Google Sheets API | `sheets` |
| Google Slides API | `slides` |
| Google Tasks API | `tasks` |
| Google Forms API | `forms` |
| People API | `contacts`, `people` |
| Google Chat API | `chat` |
| Google Classroom API | `classroom` |
| Apps Script API | `appscript` |

**3. Create OAuth Credentials**

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Desktop app**
4. Copy the **Client ID** and **Client Secret**

**4. Add Credentials to gtypee**

Create `credentials.json` in the config directory:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\typee\credentials.json` |
| macOS | `~/.config/gtypee/credentials.json` |
| Linux | `~/.config/gtypee/credentials.json` |

```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "clientSecret": "YOUR_CLIENT_SECRET"
}
```

**5. Authenticate**

```bash
# Browser flow
gtypee auth add --email you@gmail.com

# Manual flow (no browser auto-open)
gtypee auth add --email you@gmail.com --manual

# Remote/headless (SSH, server)
gtypee auth add --email you@gmail.com --remote --step 1
# Open URL in browser, then:
gtypee auth add --email you@gmail.com --remote --step 2 --auth-url "http://localhost:PORT/?code=..."
```

**6. Verify**

```bash
gtypee auth status
gtypee auth list
gtypee people me
```

### Service Account (Workspace Admin)

For Workspace administrators who need to:
- Access employee data across the organization
- Run automated/headless scripts
- Use Workspace-only APIs (Groups, Keep)

**1. Create a Service Account**

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account**
3. Go to **Keys** tab > **Add Key > Create new key > JSON**
4. Save the JSON file securely

**2. Enable Domain-Wide Delegation**

1. On the service account, click **Show Advanced Settings**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Note the **Client ID** (numeric)

**3. Authorize Scopes in Admin Console**

1. Go to [Admin Console](https://admin.google.com) > **Security > API Controls**
2. Click **Manage Domain Wide Delegation** > **Add new**
3. Enter the service account **Client ID**
4. Paste the required scopes (comma-separated)

<details>
<summary>All scopes (click to expand)</summary>

```
https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.settings.basic,https://www.googleapis.com/auth/gmail.settings.sharing,https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/chat.spaces,https://www.googleapis.com/auth/chat.messages,https://www.googleapis.com/auth/chat.memberships,https://www.googleapis.com/auth/chat.users.readstate.readonly,https://www.googleapis.com/auth/classroom.courses,https://www.googleapis.com/auth/classroom.rosters,https://www.googleapis.com/auth/classroom.coursework.students,https://www.googleapis.com/auth/classroom.coursework.me,https://www.googleapis.com/auth/classroom.courseworkmaterials,https://www.googleapis.com/auth/classroom.announcements,https://www.googleapis.com/auth/classroom.topics,https://www.googleapis.com/auth/classroom.guardianlinks.students,https://www.googleapis.com/auth/classroom.profile.emails,https://www.googleapis.com/auth/classroom.profile.photos,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/presentations,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/contacts,https://www.googleapis.com/auth/contacts.other.readonly,https://www.googleapis.com/auth/directory.readonly,https://www.googleapis.com/auth/tasks,https://www.googleapis.com/auth/forms.body,https://www.googleapis.com/auth/forms.responses.readonly,https://www.googleapis.com/auth/script.projects,https://www.googleapis.com/auth/script.deployments,https://www.googleapis.com/auth/script.processes,https://www.googleapis.com/auth/admin.directory.user,https://www.googleapis.com/auth/admin.directory.user.security,https://www.googleapis.com/auth/admin.directory.orgunit,https://www.googleapis.com/auth/admin.directory.group,https://www.googleapis.com/auth/admin.directory.group.member,https://www.googleapis.com/auth/admin.directory.device.chromeos,https://www.googleapis.com/auth/admin.directory.device.mobile,https://www.googleapis.com/auth/admin.reports.audit.readonly,https://www.googleapis.com/auth/keep.readonly
```

</details>

<details>
<summary>Workspace Admin only scopes (minimal)</summary>

```
https://www.googleapis.com/auth/admin.directory.user,https://www.googleapis.com/auth/admin.directory.user.security,https://www.googleapis.com/auth/admin.directory.orgunit,https://www.googleapis.com/auth/admin.directory.group,https://www.googleapis.com/auth/admin.directory.group.member,https://www.googleapis.com/auth/admin.directory.device.chromeos,https://www.googleapis.com/auth/admin.directory.device.mobile,https://www.googleapis.com/auth/admin.reports.audit.readonly
```

</details>

**4. Import the Key**

```bash
gtypee auth add-sa --key-file /path/to/sa-key.json
gtypee auth set-default-sa --email sa@project.iam.gserviceaccount.com
```

**5. Use Service Account**

```bash
# With explicit SA
gtypee --sa sa@project.iam.gserviceaccount.com --impersonate user@domain.com gmail labels

# With default SA
gtypee --impersonate user@domain.com drive ls
```

---

## Commands Reference

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON output (for scripting) |
| `--plain` | Stable plain-text output |
| `--account <email>` | Select OAuth account |
| `--client <name>` | Select OAuth client credentials |
| `--sa <email>` | Use service account |
| `--impersonate <email>` | Impersonate Workspace user (requires `--sa`) |
| `--verbose` | Verbose logging |
| `--dry-run` | Show planned actions without executing |

### Gmail Commands

**Messages**

```bash
gtypee gmail list                                    # List recent messages
gtypee gmail list --query "is:unread"                # Filter with Gmail query
gtypee gmail search --query "from:boss@company.com"  # Search messages
gtypee gmail get <message-id>                        # Get full message
gtypee gmail delete <message-id> --force             # Permanently delete
gtypee gmail trash <message-id>                      # Move to trash
gtypee gmail untrash <message-id>                    # Restore from trash
gtypee gmail modify <message-id> --add-label STARRED --remove-label UNREAD
gtypee gmail send --to person@example.com --subject "Hello" --body "Hi there"
```

**Drafts**

```bash
gtypee gmail draft create --to person@example.com --subject "Draft" --body "Content"
gtypee gmail draft list
gtypee gmail draft get <draft-id>
gtypee gmail draft delete <draft-id> --force
gtypee gmail draft send <draft-id>
```

**Threads**

```bash
gtypee gmail thread list
gtypee gmail thread list --query "has:attachment"
gtypee gmail thread get <thread-id>
```

**Labels**

```bash
gtypee gmail labels                        # List all labels
gtypee gmail label create --name "Projects" --color "#ffcc00:#000000"
gtypee gmail label get <label-id>
gtypee gmail label update <label-id> --name "New Name"
gtypee gmail label delete <label-id> --force
```

**Filters**

```bash
gtypee gmail filter list
gtypee gmail filter create --query "from:newsletter@example.com" --add-label TRASH
gtypee gmail filter delete <filter-id> --force
```

**Signatures**

```bash
gtypee gmail signature list
gtypee gmail signature get --email you@example.com
gtypee gmail signature set --email you@example.com --signature "Best, John"
```

### Drive Commands

**Files and Folders**

```bash
gtypee drive ls                                    # List files
gtypee drive search --query "name contains 'report'"
gtypee drive download --id <file-id> --out ./file.pdf
gtypee drive upload --path ./report.pdf
gtypee drive delete <file-id>                      # Move to trash
gtypee drive delete <file-id> --permanent          # Permanently delete
gtypee drive copy <file-id> --name "Copy of File"
gtypee drive move <file-id> --parent <folder-id>
gtypee drive rename <file-id> --name "New Name"
gtypee drive mkdir --name "New Folder"
gtypee drive info <file-id>
```

**Permissions**

```bash
gtypee drive permission list <file-id>
gtypee drive permission create <file-id> --email person@example.com --role reader
gtypee drive permission create <file-id> --email team@company.com --role writer --type group
gtypee drive permission delete <file-id> --permission-id <perm-id>
```

**Comments**

```bash
gtypee drive comment list <file-id>
gtypee drive comment create <file-id> --content "Please review this"
gtypee drive comment delete <file-id> --comment-id <comment-id>
```

**Revisions**

```bash
gtypee drive revision list <file-id>
gtypee drive revision get <file-id> --revision-id <rev-id>
gtypee drive revision delete <file-id> --revision-id <rev-id>
```

### Calendar Commands

```bash
gtypee calendar events                               # List upcoming events
gtypee calendar events --from "2026-03-01" --to "2026-03-31"
gtypee calendar create --summary "Team Meeting" --start "2026-03-15T10:00:00" --end "2026-03-15T11:00:00"
gtypee calendar update --id <event-id> --summary "Updated Meeting"
gtypee calendar respond --id <event-id> --response accepted
gtypee calendar conflicts --from "2026-03-01" --to "2026-03-31"
```

### Workspace Admin Commands

> **Note:** Workspace admin commands require a service account with domain-wide delegation.

**Quick Examples with Service Account:**

```bash
# Set up alias for convenience
alias gtypee-admin='npm run dev -- --sa your-sa@project.iam.gserviceaccount.com --impersonate admin@yourdomain.com'

# Or use directly:
gtypee --sa your-sa@project.iam.gserviceaccount.com --impersonate admin@yourdomain.com workspace user list
```

**User Management**

```bash
gtypee workspace user list                              # List all users
gtypee workspace user list --org-unit "/Sales"          # Filter by org unit
gtypee workspace user create --email john@company.com --first-name John --last-name Doe
gtypee workspace user create --email jane@company.com --first-name Jane --last-name Smith --password Temp123! --org-unit "/Engineering" --admin
gtypee workspace user delete --email user@company.com --force
gtypee workspace user suspend --email user@company.com
gtypee workspace user unsuspend --email user@company.com
gtypee workspace user reset-password --email user@company.com
gtypee workspace user set-admin --email user@company.com --yes
gtypee workspace user set-org-unit --email user@company.com --org-unit "/Sales"
```

**User Aliases**

```bash
gtypee workspace user add-alias --email user@company.com --alias alias@company.com
gtypee workspace user list-aliases --email user@company.com
gtypee workspace user delete-alias --email user@company.com --alias alias@company.com
```

**User Photos**

```bash
gtypee workspace user set-photo --email user@company.com --path ./photo.jpg
gtypee workspace user delete-photo --email user@company.com
```

**Backup Codes**

```bash
gtypee workspace user generate-backup-codes --email user@company.com
```

**Group Management**

```bash
gtypee workspace group list
gtypee workspace group create --email team@company.com --name "Team Group"
gtypee workspace group delete --email team@company.com --force
gtypee workspace group list-members --group team@company.com
gtypee workspace group add-member --group team@company.com --email user@company.com --role MEMBER
gtypee workspace group remove-member --group team@company.com --email user@company.com
```

**Organization Units**

```bash
gtypee workspace org list
gtypee workspace org create --name "Engineering" --parent "/" --description "Engineering team"
gtypee workspace org get --path "/Engineering"
gtypee workspace org update --path "/Engineering" --name "Dev Team"
gtypee workspace org delete --path "/Engineering" --force
```

**Devices**

```bash
gtypee workspace device list
gtypee workspace device list --type chromebook
gtypee workspace device list --type mobile --org-unit "/Sales"
```

**Reports**

```bash
gtypee workspace report logins --days 30
gtypee workspace report admin --days 7
```

### Docs, Sheets, Slides Commands

**Google Docs**

```bash
gtypee docs create --title "My Document"
gtypee docs read --id <doc-id>
gtypee docs markdown --id <doc-id>          # Export as markdown
gtypee docs write --id <doc-id> --markdown "# Heading\nContent"
```

**Google Sheets**

```bash
gtypee sheets create --title "My Spreadsheet"
gtypee sheets read --id <sheet-id> --range "Sheet1!A1:D10"
gtypee sheets update --id <sheet-id> --range "Sheet1!A1:B2" --values "Name,Age;John,30;Jane,25"
```

**Google Slides**

```bash
gtypee slides create --title "My Presentation"
gtypee slides list --id <presentation-id>
gtypee slides read --id <presentation-id> --index 0
gtypee slides export --id <presentation-id> --format pdf
```

### Other Services

**Tasks**

```bash
gtypee tasks list
gtypee tasks list --list <task-list-id>
gtypee tasks add --title "Buy groceries"
gtypee tasks update --id <task-id> --title "Updated task"
gtypee tasks done --id <task-id>
```

**Forms**

```bash
gtypee forms create --title "Survey"
gtypee forms get --id <form-id>
gtypee forms responses --id <form-id>
```

**Contacts**

```bash
gtypee contacts list
gtypee contacts search --query "john"
gtypee contacts get --resource <resource-name>
gtypee contacts update --resource <resource-name> --email new@email.com
```

**People**

```bash
gtypee people me                      # Show your profile
gtypee people search --query "john"
gtypee people get --resource <resource-name>
gtypee people update --resource <resource-name> --name "New Name"
```

**Chat**

```bash
gtypee chat spaces
gtypee chat get-space --space <space-id>
gtypee chat create-space --name "New Space"
gtypee chat messages --space <space-id>
gtypee chat send --space <space-id> --text "Hello team!"
```

**Classroom**

```bash
gtypee classroom courses
gtypee classroom get-course --course <course-id>
gtypee classroom create-course --name "New Course"
gtypee classroom submissions --course <course-id>
```

**Groups (Legacy)**

```bash
gtypee groups list
gtypee groups get --group <group-key>
gtypee groups members --group <group-key>
gtypee groups add-member --group <group-key> --email user@company.com --role MEMBER
gtypee groups remove-member --group <group-key> --email user@company.com
```

**Keep**

```bash
gtypee keep list
gtypee keep get --id <note-id>
gtypee keep search --query "shopping"
gtypee keep create --title "Shopping List"
gtypee keep update --id <note-id> --title "Updated Title"
```

**Apps Script**

```bash
gtypee appscript list
gtypee appscript get --id <script-id>
gtypee appscript create --title "My Script"
gtypee appscript run --id <script-id> --fn myFunction
gtypee appscript run --id <script-id> --fn myFunction --params '["arg1", "arg2"]'
```

### Desire-Path Aliases

Top-level shortcuts for common commands:

| Alias | Expands To |
|-------|-----------|
| `gtypee send` | `gtypee gmail send` |
| `gtypee ls` | `gtypee drive ls` |
| `gtypee search` | `gtypee drive search` |
| `gtypee download` | `gtypee drive download` |
| `gtypee upload` | `gtypee drive upload` |
| `gtypee login` | `gtypee auth add` |
| `gtypee logout` | `gtypee auth remove` |
| `gtypee status` | `gtypee auth status` |
| `gtypee me` | `gtypee people me` |
| `gtypee whoami` | `gtypee people me` |

---

## Usage Scenarios

This section covers practical real-world examples organized by common use cases.

### User Management Scenarios

#### Onboarding a New Employee

```bash
# 1. Create the user with initial settings
gtypee workspace user create \
  --email john.doe@company.com \
  --first-name John \
  --last-name Doe \
  --password "Temp@12345" \
  --org-unit "/Engineering" \
  --change-password-next-login

# 2. Add email aliases
gtypee workspace user add-alias \
  --email john.doe@company.com \
  --alias jdoe@company.com

# 3. Add to appropriate groups
gtypee workspace group add-member \
  --group engineering@company.com \
  --email john.doe@company.com \
  --role MEMBER

gtypee workspace group add-member \
  --group all-staff@company.com \
  --email john.doe@company.com

# 4. Generate backup codes for 2FA
gtypee workspace user generate-backup-codes \
  --email john.doe@company.com

# 5. Verify the user was created correctly
gtypee workspace user list --json | jq '.[] | select(.primaryEmail == "john.doe@company.com")'
```

#### Offboarding an Employee

```bash
# 1. Suspend the account immediately
gtypee workspace user suspend --email former@company.com

# 2. Remove from all groups (list first)
gtypee workspace group list --json | jq '.[].email' | while read group; do
  gtypee workspace group remove-member --group "$group" --email former@company.com 2>/dev/null
done

# 3. Transfer Drive files to manager
gtypee --impersonate former@company.com drive ls --json | jq '.[].id' | while read file; do
  gtypee --impersonate former@company.com drive permission create "$file" \
    --email manager@company.com --role owner --transfer-ownership
done

# 4. Delete after hold period (30+ days)
gtypee workspace user delete --email former@company.com --force
```

#### Bulk User Operations

```bash
# Export all users to CSV
gtypee workspace user list --json | jq -r '.[] | [.primaryEmail, .name.givenName, .name.familyName, .orgUnitPath, .suspended] | @csv' > users.csv

# Find all suspended users
gtypee workspace user list --json | jq '.[] | select(.suspended == true) | .primaryEmail'

# Find all admin users
gtypee workspace user list --json | jq '.[] | select(.isAdmin == true) | .primaryEmail'

# Count users by org unit
gtypee workspace user list --json | jq -r '.[].orgUnitPath' | sort | uniq -c

# Find users who haven't changed password in 90 days (via login audit)
gtypee workspace report logins --days 90 --json | jq -r '.[] | select(.success == true) | .userEmail' | sort | uniq
```

### Group Management Scenarios

#### Creating a Project Team Group

```bash
# 1. Create the group
gtypee workspace group create \
  --email project-alpha@company.com \
  --name "Project Alpha Team" \
  --description "Members of Project Alpha"

# 2. Add team members
for email in alice@company.com bob@company.com charlie@company.com; do
  gtypee workspace group add-member \
    --group project-alpha@company.com \
    --email "$email" \
    --role MEMBER
done

# 3. Add project manager as owner
gtypee workspace group add-member \
  --group project-alpha@company.com \
  --email pm@company.com \
  --role OWNER

# 4. Verify membership
gtypee workspace group list-members --group project-alpha@company.com
```

#### Group Membership Audit

```bash
# List all groups and their member counts
gtypee workspace group list --json | jq '.[] | .email' | while read group; do
  count=$(gtypee workspace group list-members --group "$group" --json | jq 'length')
  echo "$group: $count members"
done

# Find all groups a user belongs to
gtypee workspace group list --json | jq '.[].email' | while read group; do
  if gtypee workspace group list-members --group "$group" --json | jq -e ".[] | select(.email == \"user@company.com\")" > /dev/null; then
    echo "$group"
  fi
done

# Export group memberships to CSV
gtypee workspace group list --json | jq '.[].email' | while read group; do
  gtypee workspace group list-members --group "$group" --json | jq -r ".[] | [\"$group\", .email, .role] | @csv"
done > group-memberships.csv
```

### Organization Unit Management

#### Creating an Org Structure

```bash
# Create top-level departments
for dept in Engineering Sales Marketing HR Finance; do
  gtypee workspace org create \
    --name "$dept" \
    --parent "/" \
    --description "$dept Department"
done

# Create sub-units under Engineering
gtypee workspace org create \
  --name "Backend" \
  --parent "/Engineering" \
  --description "Backend Engineering Team"

gtypee workspace org create \
  --name "Frontend" \
  --parent "/Engineering" \
  --description "Frontend Engineering Team"

gtypee workspace org create \
  --name "DevOps" \
  --parent "/Engineering" \
  --description "DevOps Team"

# View the full org structure
gtypee workspace org list
```

#### Moving Users Between Org Units

```bash
# Move a user to a new org unit
gtypee workspace user set-org-unit \
  --email user@company.com \
  --org-unit "/Engineering/Backend"

# Bulk move users from CSV
cat users-to-move.csv | while read email org_unit; do
  gtypee workspace user set-org-unit --email "$email" --org-unit "$org_unit"
done

# List all users in a specific org unit
gtypee workspace user list --org-unit "/Engineering" --json | jq '.[].primaryEmail'
```

### Device Management Scenarios

#### Device Inventory and Audit

```bash
# List all ChromeOS devices
gtypee workspace device list --type chromebook --json > chromebooks.json

# List all mobile devices
gtypee workspace device list --type mobile --json > mobiles.json

# Find devices by org unit
gtypee workspace device list --org-unit "/Sales" --json | jq '.[]'

# Find devices not synced in 30 days
gtypee workspace device list --json | jq '.[] | select(.lastSync < "2026-01-21")'

# Export device inventory to CSV
gtypee workspace device list --json | jq -r '.[] | [.deviceId, .email, .modelName, .status, .orgUnitPath, .lastSync] | @csv' > devices.csv
```

### Gmail Automation Scenarios

#### Email Management

```bash
# Find all unread emails from a sender
gtypee gmail search --query "from:newsletter@example.com is:unread" --json | jq '.messages[].id'

# Bulk archive old newsletters
gtypee gmail search --query "from:newsletter@example.com older_than:30d" --json | jq '.messages[].id' | while read id; do
  gtypee gmail modify "$id" --remove-label INBOX
done

# Create labels for project organization
for project in alpha beta gamma; do
  gtypee gmail label create --name "Project-$project" --color "#00ff00:#000000"
done

# Create filters for automatic labeling
gtypee gmail filter create \
  --query "from:client@company.com" \
  --add-label "Project-alpha"

# Export all filters for backup
gtypee gmail filter list --json > filters-backup.json
```

#### Signature Management

```bash
# Set standard signature for a user
gtypee gmail signature set \
  --email user@company.com \
  --signature "John Doe
Software Engineer
Company Inc.
Phone: +1-555-123-4567"

# List all signatures (requires admin access)
gtypee gmail signature list

# Update signature across multiple accounts
for email in $(cat users.txt); do
  gtypee --impersonate "$email" gmail signature set \
    --email "$email" \
    --signature "$(cat standard-sig.txt)"
done
```

### Drive Management Scenarios

#### File Organization

```bash
# Create folder structure
gtypee drive mkdir --name "2026 Projects" --parent root
gtypee drive mkdir --name "Q1 Reports" --parent "<2026-Projects-folder-id>"

# Find large files (>10MB)
gtypee drive search --query "mimeType != 'application/vnd.google-apps.folder'" --json | \
  jq '.[] | select(.size > 10000000) | {name, size, id}'

# Find files shared externally
gtypee drive ls --json | jq '.[] | select(.shared == true) | {name, id}'

# Bulk download files by type
gtypee drive search --query "mimeType = 'application/pdf'" --json | jq '.[].id' | while read id; do
  gtypee drive download --id "$id" --out "./pdfs/"
done

# Find and trash old files
gtypee drive search --query "modifiedTime < '2023-01-01'" --json | jq '.[].id' | while read id; do
  gtypee drive delete "$id"
done
```

#### Permission Auditing

```bash
# List permissions for a file
gtypee drive permission list <file-id> --json

# Find files with public access
gtypee drive permission list <file-id> --json | jq '.[] | select(.type == "anyone")'

# Share a file with team
gtypee drive permission create <file-id> \
  --email team@company.com \
  --role reader \
  --type group

# Remove external sharing
gtypee drive permission list <file-id> --json | jq '.[] | select(.type == "user" and .emailAddress | endswith("@competitor.com")) | .id' | while read perm_id; do
  gtypee drive permission delete <file-id> --permission-id "$perm_id"
done
```

### Security and Compliance Scenarios

#### Login Audit and Security Review

```bash
# Get login activities for past 30 days
gtypee workspace report logins --days 30 --json > login-audit.json

# Find failed login attempts
gtypee workspace report logins --days 30 --json | jq '.[] | select(.success == false)'

# Find logins from unusual locations
gtypee workspace report logins --days 7 --json | jq '.[] | select(.country != "US") | {userEmail, ipAddress, country, timestamp}'

# Find concurrent sessions
gtypee workspace report logins --days 1 --json | jq -r '.[] | select(.success == true) | .userEmail' | sort | uniq -c | awk '$1 > 5 {print}'
```

#### Admin Activity Audit

```bash
# Get admin activities for past 7 days
gtypee workspace report admin --days 7 --json > admin-audit.json

# Find user creation events
gtypee workspace report admin --days 30 --json | jq '.[] | select(.action == "CREATE_USER")'

# Find permission changes
gtypee workspace report admin --days 30 --json | jq '.[] | select(.action | contains("CHANGE") or contains("GRANT"))'

# Export audit log to CSV
gtypee workspace report admin --days 30 --json | jq -r '.[] | [.timestamp, .userEmail, .action, .resource] | @csv' > admin-audit.csv
```

### Cross-Service Workflows

#### New Hire Complete Setup

```bash
#!/bin/bash
# new-hire.sh - Complete new hire setup script

EMAIL=$1
FIRST_NAME=$2
LAST_NAME=$3
ORG_UNIT=$4

# Create user
echo "Creating user $EMAIL..."
gtypee workspace user create \
  --email "$EMAIL" \
  --first-name "$FIRST_NAME" \
  --last-name "$LAST_NAME" \
  --org-unit "$ORG_UNIT" \
  --change-password-next-login

# Wait for user propagation
sleep 10

# Add to All Staff group
gtypee workspace group add-member \
  --group all-staff@company.com \
  --email "$EMAIL"

# Add to department group based on org unit
if [[ "$ORG_UNIT" == *"/Engineering"* ]]; then
  gtypee workspace group add-member --group engineering@company.com --email "$EMAIL"
elif [[ "$ORG_UNIT" == *"/Sales"* ]]; then
  gtypee workspace group add-member --group sales@company.com --email "$EMAIL"
fi

# Create standard Drive folders
gtypee --impersonate "$EMAIL" drive mkdir --name "My Documents"
gtypee --impersonate "$EMAIL" drive mkdir --name "Projects"

# Set email signature
gtypee --impersonate "$EMAIL" gmail signature set \
  --email "$EMAIL" \
  --signature "$FIRST_NAME $LAST_NAME
Company Inc.
$EMAIL"

# Generate backup codes
gtypee workspace user generate-backup-codes --email "$EMAIL"

echo "Setup complete for $EMAIL"
```

#### Daily Admin Report

```bash
#!/bin/bash
# daily-report.sh - Generate daily admin report

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="admin-report-$REPORT_DATE.txt"

echo "=== Daily Admin Report - $REPORT_DATE ===" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "--- User Stats ---" >> "$REPORT_FILE"
TOTAL_USERS=$(gtypee workspace user list --json | jq 'length')
SUSPENDED=$(gtypee workspace user list --json | jq '[.[] | select(.suspended == true)] | length')
echo "Total Users: $TOTAL_USERS" >> "$REPORT_FILE"
echo "Suspended: $SUSPENDED" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "--- Failed Logins (Last 24h) ---" >> "$REPORT_FILE"
gtypee workspace report logins --days 1 --json | jq '.[] | select(.success == false) | "  - \(.userEmail) from \(.ipAddress)"' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "--- Admin Actions (Last 24h) ---" >> "$REPORT_FILE"
gtypee workspace report admin --days 1 --json | jq '.[] | "  - \(.timestamp): \(.userEmail) - \(.action)"' >> "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

### Scripting with JSON Output

#### Using jq for Filtering

```bash
# Get active users in Engineering
gtypee workspace user list --json | jq '.[] | select(.suspended == false and .orgUnitPath == "/Engineering") | .primaryEmail'

# Count users by last name initial
gtypee workspace user list --json | jq -r '.[].name.familyName' | cut -c1 | sort | uniq -c | sort -rn

# Find users with specific email domain
gtypee workspace user list --json | jq '.[] | select(.primaryEmail | endswith("@engineering.company.com")) | .primaryEmail'

# Get user counts by org unit
gtypee workspace user list --json | jq 'group_by(.orgUnitPath) | map({org: .[0].orgUnitPath, count: length}) | sort_by(-.count)'

# Extract email addresses for mail merge
gtypee workspace user list --json | jq -r '.[] | select(.suspended == false) | "\(.name.givenName) \(.name.familyName),\(.primaryEmail)"' > mail-merge.csv
```

#### Using PowerShell (Windows)

```powershell
# Get all users and convert to PowerShell objects
$users = gtypee workspace user list --json | ConvertFrom-Json

# Filter and display
$users | Where-Object { $_.suspended -eq $false } | Select-Object primaryEmail, orgUnitPath

# Count by org unit
$users | Group-Object orgUnitPath | Select-Object Name, Count | Sort-Object Count -Descending

# Export to CSV
$users | Select-Object primaryEmail, @{N='FirstName';E={$_.name.givenName}}, @{N='LastName';E={$_.name.familyName}}, orgUnitPath, suspended | Export-Csv users.csv -NoTypeInformation
```

#### Using Python

```python
import subprocess
import json

# Run gtypee command and parse JSON
def gtypee_json(cmd):
    result = subprocess.run(f"gtypee {cmd} --json", shell=True, capture_output=True, text=True)
    return json.loads(result.stdout)

# Get all users
users = gtypee_json("workspace user list")

# Filter active users in Engineering
active_engineering = [
    u for u in users
    if not u.get('suspended', False) and u.get('orgUnitPath') == '/Engineering'
]

# Print emails
for user in active_engineering:
    print(user['primaryEmail'])

# Group by org unit
from collections import defaultdict
by_org = defaultdict(list)
for user in users:
    by_org[user.get('orgUnitPath', 'Unknown')].append(user['primaryEmail'])

for org, emails in sorted(by_org.items()):
    print(f"{org}: {len(emails)} users")
```

---

## JSON Output

All commands support `--json` for script-friendly output:

```bash
gtypee gmail list --json
gtypee drive ls --json
gtypee workspace user list --json
```

> **Important for Development:** If running from source, use the compiled version for JSON output:
> ```bash
> # CORRECT - clean JSON output
> node dist/bin/gtypee.js workspace user list --json | jq '.[].primaryEmail'
>
> # WRONG - npm adds extra text that breaks JSON parsing
> npm run dev -- workspace user list --json | jq
> ```

Example output:

```json
{
  "messages": [
    {
      "id": "18f3a2b1c4d5e6f7",
      "threadId": "18f3a2b1c4d5e6f7",
      "subject": "Project Update"
    }
  ]
}
```

Perfect for piping to `jq` or other tools:

```bash
gtypee gmail list --json | jq '.messages[].subject'
gtypee workspace user list --json | jq '.[] | select(.suspended == false) | .primaryEmail'
```

---

## Configuration

### Config File Location

| OS | Path |
|----|------|
| Windows | `%APPDATA%\typee\` |
| macOS | `~/.config/gtypee/` |
| Linux | `~/.config/gtypee/` |

### Files

| File | Description |
|------|-------------|
| `credentials.json` | OAuth client credentials |
| `credentials-<name>.json` | Named OAuth client (use with `--client`) |
| `credentials.enc` | Encrypted stored tokens and service account keys |

### Security

- Credentials are encrypted using AES-256-GCM with a machine-derived key
- Never commit credentials or key files to version control
- The `.gitignore` excludes `*-sa-key.json` patterns

---

## Development

### Running from Source

```bash
# Clone and install
git clone https://github.com/ejpespa/gtypee.git
cd gtypee
npm install

# Build the project
npm run build

# Run the compiled CLI (RECOMMENDED)
node dist/bin/gtypee.js --help

# Run in dev mode (for quick testing only)
npm run dev -- --help
```

> **Pro Tip:** Create an alias for the compiled version to save typing:
> ```bash
> # Add to ~/.bashrc or ~/.zshrc
> alias gtypee='node /path/to/gtypee/dist/bin/gtypee.js'
> ```

### npm Scripts

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run with ts-node (dev mode)
npm run typecheck    # Type-check without emitting
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
```

### Project Structure

```
src/
  cmd/                    # Command definitions
    gmail/commands.ts     # Gmail commands
    drive/commands.ts     # Drive commands
    calendar/commands.ts  # Calendar commands
    workspace/commands.ts # Workspace admin commands
    auth/commands.ts      # Authentication commands
    ...
  googleapi/              # Google API client wrappers
  googleauth/             # Authentication handling
  outfmt/                 # Output formatting
```

---

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/ejpespa/gtypee/pulls).

### Development Setup

```bash
git clone https://github.com/ejpespa/gtypee.git
cd gtypee
npm install
npm run build
npm test
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning:

| Commit Type | Version Impact | Example |
|-------------|----------------|---------|
| `feat:` | Minor (1.0.0 → 1.1.0) | `feat: add user export command` |
| `fix:` | Patch (1.0.0 → 1.0.1) | `fix: resolve pagination issue` |
| `feat!:` or `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) | `feat!: redesign CLI structure` |
| `docs:`, `chore:`, `refactor:` | No release | `docs: update README` |

```bash
# Examples
git commit -m "feat: add workspace device wipe command"    # → Minor bump
git commit -m "fix: handle empty email body"               # → Patch bump
git commit -m "feat!: change API response format"          # → Major bump
git commit -m "docs: add usage examples"                   # → No release
```

### Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Commit using conventional format (`git commit -m "feat: add amazing feature"`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
7. Ensure CI tests pass
8. After merge, release happens automatically! 🚀

---

## Supported Services

| Service | API | Personal Account | Workspace (SA) |
|---------|-----|:---:|:---:|
| Gmail | Gmail API | Yes | Yes |
| Calendar | Calendar API | Yes | Yes |
| Drive | Drive API | Yes | Yes |
| Docs | Docs API + Drive API | Yes | Yes |
| Sheets | Sheets API + Drive API | Yes | Yes |
| Slides | Slides API + Drive API | Yes | Yes |
| Tasks | Tasks API | Yes | Yes |
| Forms | Forms API | Yes | Yes |
| Contacts | People API | Yes | Yes |
| People | People API | Yes | Yes |
| Chat | Chat API | Yes | Yes |
| Classroom | Classroom API | Yes | Yes |
| Apps Script | Apps Script API + Drive API | Yes | Yes |
| Groups | Admin SDK Directory API | No | Yes |
| Keep | Keep API | No | Yes |
| Workspace Admin | Admin SDK API | No | Yes |

---

## Tips & Troubleshooting

### Most Common Issue: npm Output Breaks JSON Parsing

If you see `jq: parse error: Invalid numeric literal at line 2, column 2`:

```bash
# PROBLEM: npm adds header text to output
npm run dev -- workspace user list --json | jq '.[].primaryEmail'
# Output: > gtypee@1.0.0 dev
#         > ts-node src/bin/gtypee.ts "--impersonate" ...
#         jq: parse error: Invalid numeric literal...

# SOLUTION 1: Use the compiled version
npm run build
node dist/bin/gtypee.js workspace user list --json | jq '.[].primaryEmail'

# SOLUTION 2: Output to file first, then process
npm run dev -- workspace user list --json > output.json
jq '.[].primaryEmail' output.json

# SOLUTION 3: Create an alias to the compiled version
alias gtypee='node /path/to/gtypee/dist/bin/gtypee.js'
gtypee workspace user list --json | jq '.[].primaryEmail'
```

### Common Issues

#### "Auth required" Error

```bash
# Check current auth status
gtypee auth status

# For workspace admin, ensure you're using service account with impersonation
gtypee --sa your-sa@project.iam.gserviceaccount.com --impersonate admin@domain.com workspace user list

# For personal accounts, re-authenticate
gtypee auth add --email you@gmail.com
```

#### Insufficient Permissions / Scope Errors

Make sure the required APIs are enabled in Google Cloud Console and the correct scopes are authorized:

- **Personal accounts**: Enable APIs in [API Library](https://console.cloud.google.com/apis/library)
- **Service accounts**: Add scopes in [Admin Console > Security > API Controls > Domain Wide Delegation](https://admin.google.com/ac/owl)

See [Authentication](#authentication) section for full scope lists.

#### jq Not Found (Windows)

Install jq using one of these methods:

```bash
# Using winget
winget install stedolan.jq

# Using chocolatey
choco install jq

# Using scoop
scoop install jq

# Or use PowerShell's ConvertFrom-Json instead of jq
node dist/bin/gtypee.js workspace user list --json | ConvertFrom-Json | Select-Object -ExpandProperty primaryEmail
```

### Performance Tips

#### Large User Lists

```bash
# Use --json and filter with jq for large datasets
gtypee workspace user list --json | jq '.[] | select(.suspended == false) | .primaryEmail'

# Or redirect to file first
gtypee workspace user list --json > users.json
jq '.[] | .primaryEmail' users.json
```

#### Batch Operations

```bash
# Process in parallel with xargs
gtypee workspace user list --json | jq -r '.[].primaryEmail' | xargs -P 4 -I {} gtypee workspace user generate-backup-codes --email "{}"

# Or use a shell script with proper error handling
for email in $(cat users.txt); do
  echo "Processing $email..."
  gtypee workspace user set-org-unit --email "$email" --org-unit "/NewOU" || echo "Failed: $email"
done
```

### Useful Aliases

Add these to your `.bashrc` or `.zshrc`:

```bash
# Point to your gtypee installation (if running from source)
export GTYPEE_PATH="/path/to/gtypee/dist/bin/gtypee.js"

# Base alias for compiled version
alias gtypee="node $GTYPEE_PATH"

# Workspace admin with service account (UPDATE THESE VALUES!)
alias twa='node /path/to/gtypee/dist/bin/gtypee.js --sa your-sa@project.iam.gserviceaccount.com --impersonate admin@yourdomain.com'

# Quick JSON + jq combos
alias tj-users='node /path/to/gtypee/dist/bin/gtypee.js workspace user list --json | jq'
alias tj-groups='node /path/to/gtypee/dist/bin/gtypee.js workspace group list --json | jq'

# Common queries
alias active-users='twa workspace user list --json | jq ".[] | select(.suspended == false) | .primaryEmail"'
alias suspended-users='twa workspace user list --json | jq ".[] | select(.suspended == true) | .primaryEmail"'
alias admin-users='twa workspace user list --json | jq ".[] | select(.isAdmin == true) | .primaryEmail"'
alias count-users='twa workspace user list --json | jq "length"'
alias failed-logins='twa workspace report logins --days 1 --json | jq ".[] | select(.success == false)"'
alias recent-admin-actions='twa workspace report admin --days 1 --json | jq ".[].action" | sort | uniq -c'
```

## Acknowledgements

This project was inspired by these excellent Google CLI tools:

- [gogcli](https://github.com/steipete/gogcli) - Google CLI by steipete
- [gmcli](https://github.com/badlogic/gmcli) - Gmail CLI by badlogic
- [gccli](https://github.com/badlogic/gccli) - Google Calendar CLI by badlogic
- [gdcli](https://github.com/badlogic/gdcli) - Google Drive CLI by badlogic

## License

ISC

---

## Links

- [GitHub Repository](https://github.com/ejpespa/gtypee)
- [npm Package](https://www.npmjs.com/package/gtypee)
- [Report Issues](https://github.com/ejpespa/gtypee/issues)
