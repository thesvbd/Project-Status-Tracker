# Database Documentation — Project Status Tracker

> Database: PostgreSQL on Supabase
> Schema: `public` (user data), `auth` (Supabase Auth — not managed directly)

---

## Tables

### `workspaces`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `name` | text | Workspace name |

---

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Corresponds to `auth.users.id` |
| `workspace_id` | uuid FK → workspaces | |
| `name` | text | Display name |
| `avatar` | text nullable | Avatar URL |
| `role` | text | `owner` / `pm` / `freelancer` |
| `is_external` | bool | External collaborator flag |

---

### `clients`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → workspaces | |
| `name` | text | |
| `email` | text nullable | |
| `phone` | text nullable | |

---

### `projects`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → workspaces | |
| `client_id` | uuid FK → clients nullable | |
| `name` | text | |
| `deadline` | date nullable | |
| `status` | text | `active` / `archived` |
| `archived_at` | timestamptz nullable | |

---

### `project_members`
| Column | Type | Description |
|--------|------|-------------|
| `project_id` | uuid FK → projects | M:N join table |
| `user_id` | uuid FK → profiles | |

PK = `(project_id, user_id)`

---

### `pages`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects | |
| `name` | text | |
| `type` | text | `page` / `global` |
| `phase` | text | See phases below |
| `deadline` | date nullable | |
| `sort_order` | int | Sort order in the table |
| `notes` | text nullable | |

---

### `subtasks`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `page_id` | uuid FK → pages | |
| `label` | text | |
| `done` | bool | |
| `phase_tag` | text nullable | Phase assignment |

---

### `page_logs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `page_id` | uuid FK → pages | |
| `user_id` | uuid FK → profiles | Who made the change |
| `from_phase` | text nullable | |
| `to_phase` | text | |
| `note` | text nullable | Optional note about the change |
| `created_at` | timestamptz | |

---

### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | Recipient |
| `project_id` | uuid FK → projects nullable | |
| `page_id` | uuid FK → pages nullable | |
| `message` | text | |
| `read` | bool | |
| `created_at` | timestamptz | |

---

### `client_access`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects | |
| `token` | uuid | Public UUID token for share link |
| `enabled` | bool | |
| `password_hash` | text nullable | bcrypt hash (pgcrypto) |

---

### `workspace_invites`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → workspaces | |
| `email` | text | |
| `role` | text | `pm` / `freelancer` |
| `token` | uuid | One-time token in invite link |
| `status` | text | `pending` / `accepted` / `declined` |
| `created_by` | uuid FK → profiles | |
| `accepted_at` | timestamptz nullable | |

---

## Phases

```
not_started → design → design_review → development → testing → client_review → done
```

Defined in `src/lib/constants.ts` as the `PHASES` array + `getPhase(key)` helper.

---

## RPC Functions

### RLS helpers (called internally by RLS policies)

```sql
-- Returns the workspace_id of the authenticated user
my_workspace_id() RETURNS uuid

-- Returns the role of the authenticated user ('owner' | 'pm' | 'freelancer')
my_role() RETURNS text

-- Returns true if the user is a member of the project
is_project_member(p_project_id uuid) RETURNS boolean
```

### Invite flow

```sql
-- Accepts an invite, switches the user to the inviting workspace
accept_workspace_invite(p_token uuid) RETURNS void

-- Declines an invite
decline_workspace_invite(p_token uuid) RETURNS void
```

### Client share link

```sql
-- Public project read without authentication (SECURITY DEFINER, GRANT TO anon)
-- p_password is optional — required if the share link is password-protected
-- IMPORTANT: search_path must include 'extensions' for crypt() from pgcrypto
get_client_view(p_token uuid, p_password text DEFAULT NULL)
  RETURNS json
  SET search_path = public, extensions
```

### Share link password management

```sql
-- Stores a bcrypt hash of the password via pgcrypto (crypt + gen_salt)
-- IMPORTANT: search_path must include 'extensions' for pgcrypto functions
set_share_password(p_project_id uuid, p_password text) RETURNS void
  SET search_path = public, extensions
```

### Account deletion

```sql
-- SECURITY DEFINER — allowed to delete from auth.users
-- Owner: cascade deletes the entire workspace and all data including auth accounts of members
-- Non-owner: deletes only own data and auth account
delete_my_account() RETURNS void
```

---

## RLS Overview

Every table has Row Level Security enabled. Basic principles:

- `workspaces` — users can only see their own workspace
- `profiles` — users can only see profiles from their own workspace
- `clients`, `projects` — Owner + PM see everything in the workspace; Freelancer only sees projects where they are in `project_members`
- `pages`, `subtasks`, `page_logs` — access through project → workspace or project_members
- `notifications` — own only (user_id = auth.uid())
- `client_access`, `workspace_invites` — through workspace
- `get_client_view` RPC — SECURITY DEFINER bypasses RLS, GRANT TO anon

---

## How to Rebuild the Database

1. Create a new Supabase project
2. Run SQL in order:
   - Tables (in order: workspaces → profiles → clients → projects → project_members → pages → subtasks → page_logs → notifications → client_access → workspace_invites)
   - RLS policies
   - RPC functions
   - `GRANT EXECUTE` on public functions
3. Update `.env.local` with new credentials

The full schema can be exported from the current project via:
```bash
supabase db dump --db-url "postgresql://..." > schema.sql
```
or via Supabase Dashboard → Settings → Database → Backups.
