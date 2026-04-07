# Project Status Tracker

> **Disclaimer:** This entire project was vibe-coded with AI (Claude) as an experiment. The code is provided as-is with no guarantees of quality, security, or reliability. Use at your own risk.

A web application for tracking the status of digital agency projects. Each project contains pages, and each page progresses through development phases — from design to final client approval.

## Tech Stack

| Area | Choice |
|------|--------|
| Framework | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Package manager | bun |
| Routing | React Router v7 |
| Hosting | Netlify |

## Features

- **Dashboard** — project cards grid with progress bar and deadline
- **Project view** — pages table, slide-over detail panel, phase change (modal + note + subtasks)
- **Gantt** — horizontal timeline of pages with color-coded phase bars
- **Clients** — CRUD management of clients
- **Archive** — archive and restore projects
- **Workspace settings** — rename workspace, manage members, send invites
- **Account settings** — change name, email, password, delete account
- **Client share link** — public read-only link to project status (optionally password-protected)
- **Notifications** — real-time badge + popover with history
- **Upcoming deadlines** — header overlay showing pages due within 30 days

## Phases

Each page moves through these phases:

```
Not Started → In Design → Design Review → In Development → In Testing → Client Review → Done
```

## Roles

| Role | Access |
|------|--------|
| **Owner** | Full access, workspace settings, workspace deletion |
| **PM** | Projects, clients, archive — no workspace settings |
| **Freelancer** | Only assigned projects (enforced via RLS at DB level) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- A [Supabase](https://supabase.com) project with the schema set up (see [docs/DATABASE.md](docs/DATABASE.md))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/project-status-app.git
cd project-status-app

# 2. Install dependencies
bun install

# 3. Create environment file
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase dashboard

# 4. Start dev server
bun dev
```

### Environment Variables

| Variable | Where to find |
|----------|---------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

> `.env.local` is in `.gitignore` — it is never committed to Git.
> `VITE_SUPABASE_ANON_KEY` is the **anon key** designed for public use. Data is protected by RLS policies at the database level, not by the key itself. **The service role key must never be used on the frontend.**

## Project Structure

```
src/
├── components/
│   ├── auth/          # AuthProvider, ProtectedRoute
│   ├── layout/        # AppLayout, Header, Sidebar
│   └── ui/            # shadcn/ui components
├── hooks/             # useCurrentUser
├── lib/               # Supabase client, constants
├── pages/             # Application pages
│   ├── Account/
│   ├── Archive/
│   ├── Auth/
│   ├── ClientView/
│   ├── Clients/
│   ├── Dashboard/
│   ├── Gantt/
│   ├── Invite/
│   ├── Project/
│   ├── ProjectSettings/
│   └── Workspace/
└── types/             # database.ts (Supabase types)
```

## Documentation

| File | Contents |
|------|----------|
| [`docs/DATABASE.md`](docs/DATABASE.md) | Table schema, RPC functions, triggers, RLS, how to rebuild the DB |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment to Netlify, environment variables, DB backups |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security overview, API keys, RLS, best practices |

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for a step-by-step guide to deploying on Netlify.

## License

This project is licensed under the [MIT License](LICENSE).
