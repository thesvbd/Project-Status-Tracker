# Deployment Guide — Project Status Tracker

> Goal: deploy the application from your local machine to the internet, accessible via a URL.
> We use GitHub (code hosting) + Netlify (web hosting).

---

## Prerequisites

- A [GitHub](https://github.com) account (free)
- A [Netlify](https://netlify.com) account (free, connected to GitHub)
- Access to [Supabase](https://supabase.com) with your project set up
- **Git** installed on your machine — verify in terminal: `git --version`

---

## Step 1 — Push the Project to GitHub

### 1a. Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `project-status-app` (or any name you prefer)
3. **Visibility:** Public or Private (your choice)
4. **Do not** check any checkboxes (no README, no .gitignore)
5. Click **Create repository**
6. GitHub will show a page with commands — keep it open

### 1b. Push the project to GitHub

Open your terminal and navigate to the project folder:

```bash
cd /path/to/project-status-app
```

Run these commands:

```bash
git init
git add .
git commit -m "initial commit"
```

Then copy the remote URL from GitHub and run:
```bash
git remote add origin https://github.com/your-username/project-status-app.git
git branch -M main
git push -u origin main
```

Refresh the GitHub page — you should see the project files.

> **Check:** You should **not** see `.env.local` in the file list — it contains keys and is automatically excluded.

---

## Step 2 — Get Environment Variables from Supabase

You will need these two values for Netlify in the next step.

1. Go to [supabase.com](https://supabase.com) → sign in → open your project
2. In the left menu at the bottom, click **Settings** (gear icon)
3. In the submenu on the left, click **API**
4. On the page you will see:

| What to find | Where on the page | Variable name |
|--------------|-------------------|---------------|
| Project URL | **Project URL/Data API** section — value starts with `https://` | `VITE_SUPABASE_URL` |
| Anon key | **Project API keys** section → **anon public** row | `VITE_SUPABASE_ANON_KEY` |

Copy both values — you will use them in Step 3.

> The anon key is a long string starting with `eyJ...` — this is normal.

---

## Step 3 — Deploy to Netlify

### 3a. Import the project from GitHub

1. Go to [app.netlify.com](https://app.netlify.com) → sign in
2. Click **Add new site** → **Import an existing project**
3. Click **GitHub**
4. Authorize Netlify (if not already done) → select the `project-status-app` repository
5. Netlify will show a **Build settings** form — fill in:
   - **Branch to deploy:** `main`
   - **Build command:** `bun run build`
   - **Publish directory:** `dist`

### 3b. Set Environment Variables

**Do NOT click Deploy yet** — first add the keys:

1. On the same page, click **Environment variables** (section below, or tab)
2. Click **Add variable** and add the first one:
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** the value from Step 2 (Project URL)
3. Click **Add variable** again and add the second one:
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** the value from Step 2 (anon key)

### 3c. Start the deploy

Click **Deploy project** — Netlify will start the build (takes 1–3 minutes).

Once complete, Netlify will show a URL like `https://your-site-123abc.netlify.app` — the app is live.

---

## Step 4 — Configure Supabase for Production

**This step is required** — without it, auth redirects (after registration, password reset) point back to localhost and won't work.

1. Go back to [supabase.com](https://supabase.com) → your project → **Authentication** (left menu)
2. Click **URL Configuration**
3. **Site URL** → delete the existing value and paste your Netlify URL:
   ```
   https://your-site-123abc.netlify.app
   ```
4. **Redirect URLs** → click **Add URL** and paste:
   ```
   https://your-site-123abc.netlify.app/**
   ```
5. Click **Save**

---

## Done

The app is running on the internet. Open your Netlify URL and test sign-in.

---

## How Future Updates Work

Whenever you change code and want to update production:

```bash
git add .
git commit -m "description of changes"
git push
```

Netlify automatically detects the push to GitHub and triggers a new build. The update is live in 1–2 minutes. No additional steps needed.

---

## Custom Domain (Optional)

If you have a custom domain (e.g., `status.your-agency.com`):

1. Netlify → Site → **Domain management → Add custom domain**
2. Follow the instructions (DNS setup at your domain registrar)
3. Netlify provides an SSL certificate automatically (free HTTPS)
4. Remember to update **Site URL** and **Redirect URLs** in Supabase Auth to the new domain

---

## Database Backups

The database runs on Supabase — data is stored there, not on Netlify.

### Free plan
No automatic backups. Export manually on a regular basis:

1. Supabase → your project → **Settings → Database**
2. **Backups** tab
3. Click **Download** — downloads a SQL file with all data

Recommended: back up at least once a month, save to disk or cloud storage.

### Pro plan ($25/month)
Automatic daily backups + point-in-time recovery. Recommended if using the app in production with real data.

---

## FAQ

**Q: Do I need to pay for Netlify?**
A: No. The free plan (Starter) is sufficient — 100 GB bandwidth/month, automatic deploys from GitHub.

**Q: What happens if I push broken code?**
A: Netlify shows a build error and the previous version stays online. Fix the issue, push again.

**Q: Where do I find logs if something isn't working?**
A: Netlify → Site → **Deploys** → click on a specific deploy → **Deploy log**

**Q: How do I change the URL (netlify.app part)?**
A: Netlify → Site → **Site configuration → Site details → Change site name**
