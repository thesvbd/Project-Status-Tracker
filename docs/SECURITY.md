# Security Overview — Project Status Tracker

---

## Environment Variables and API Keys

### What's in `.env.local`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Is it safe?

| Key | Public? | Safe? | Why |
|-----|---------|-------|-----|
| `VITE_SUPABASE_URL` | Yes | Yes | Just a URL, contains no permissions |
| `VITE_SUPABASE_ANON_KEY` | Yes (by design) | Yes | Anon key is designed for public use. Protected by RLS, not the key itself |
| Service Role key | Never | Dangerous | Not used in this project — belongs on the server only |

> **Why is the `VITE_` prefix OK?** Vite includes keys with the `VITE_` prefix directly in the bundle — they are visible in the client-side JS. This is by design for the Supabase anon key. Data is protected by RLS policies at the database level.

### `.gitignore` — what is not committed
```
*.local        # catches .env.local
node_modules
dist
```
`.env.local` **never ends up on GitHub.**

---

## Row Level Security (RLS)

Every table has RLS enabled. Users access the database directly from the browser (via the anon key), but RLS ensures they can only see **their own data**.

| Rule | Implementation |
|------|---------------|
| User can only see their own workspace | `workspace_id = my_workspace_id()` |
| Freelancer can only see assigned projects | `is_project_member(project_id)` |
| Notifications are user-specific | `user_id = auth.uid()` |
| Client view without authentication | SECURITY DEFINER RPC (controlled access) |

---

## Roles and Permissions

### Database (RLS)
- **Owner + PM:** can see all workspace data
- **Freelancer:** can only see projects where they are in `project_members` — enforced by RLS, cannot be bypassed

### Frontend (route guards)
- `/workspace` — accessible to Owner only
- `/clients` — accessible to Owner + PM

> Frontend guards are a UX layer (user doesn't see the page). RLS is the security layer (user cannot get data even via API).

---

## Passwords and Authentication

| Area | Solution |
|------|----------|
| User auth | Supabase Auth (bcrypt internally) — we never see passwords |
| Share link password | `pgcrypto` — stored as bcrypt hash (`crypt(password, gen_salt('bf'))`) |
| Invite tokens | UUID v1 — single-use, unusable after acceptance/decline |

---

## Post-Deployment Checklist

1. Verify that `.env.local` is not in the GitHub repository
2. Set Site URL in Supabase Auth (see DEPLOYMENT.md)
3. Consider enabling **Supabase Auth → Email confirmations** for production
4. Consider the **Pro plan** for automatic backups

---

## What You Should NEVER Do

- Do not push `.env.local` to GitHub
- Do not use the Service Role key on the frontend
- Do not expose the Supabase Service Role key anywhere
- Do not disable RLS on tables
