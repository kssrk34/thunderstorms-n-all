# Thunderstorms 'n' All: project handoff

Context for continuing this project in a new session. Read this first, then `README.md` for setup and hosting details. Last updated 2026-10-17.

## What it is

A private life-gamification web app for five cousins (Hyderabad and Bangalore, in their 20s): personal quests and goals, XP and levels, streaks, a cousin league, shared challenges, meetups. Owner: GitHub `kssrk34`.

- Repo: https://github.com/kssrk34/thunderstorms-n-all (appears public, so never commit secrets or user data)
- Live: https://thunderstorms-n-all.vercel.app
- Stack: Next.js 14.2.35 App Router, React 18, TypeScript, Tailwind 3, Radix primitives, Recharts, lucide-react. No other runtime dependencies were added.

## Current state

- `main` is production. **Every push to `main` deploys to Vercel production**; other branches get preview deploys. Vercel is connected through its GitHub integration.
- Latest production commit: `b8003bb` (an empty commit to redeploy after `TNA_SETUP_CODE` was added). Real changes are in `07fb787`, `a3e2a85` and `72c80a5`.
- Vercel project `thunderstorms-n-all` has an **Upstash Redis** database connected (its credentials are auto-detected) and `TNA_SETUP_CODE` set. The code's value is only in Vercel; it isn't recorded here.
- As of the last check, the live site had **no accounts yet** (`/api/setup` returned `needsSetup: true`).
- Next step for the owner: open the live site → Get Started → enter the setup code → create the organiser account → Settings → Cousins → Invite (one single-use link per cousin, valid 7 days).
- Branch `redesign-accounts-onboarding` was fast-forwarded into `main` and can be deleted.
- Local `data/` holds a fresh, empty dev database (git-ignored). Local dev data is separate from production.

## The brief we worked from (summary)

The owner pasted a brief titled "Project Thunderstorms 'n' All: website redesign and functional improvements". It was **cut off partway through section 3**. If more sections exist (4 onward), they were never received, so ask for them.

1. **Apple-inspired minimal redesign** (about 85% Apple, 15% thunderstorm identity): clean layouts, premium type, restrained palette (midnight navy, storm grey, cloud white, muted electric blue, subtle lightning accents), light and dark modes, restrained motion, a subtle lightning flash only for major milestones, and respect for reduced motion. Avoid glitter, neon, crowded dashboards and competing gamification.
2. **First-time experience**: Welcome screen ("Welcome to Project Thunderstorms 'n' All" / "Five cousins. Five journeys. One extraordinary life." / Get Started) → account and profile (name, unique username, photo or avatar, optional bio and interests) with real auth and persistent sessions, five separately owned accounts via invitations → "What would you love to achieve?" goals (suggestions shown, never auto-added) → "Create your first quest" ("Every extraordinary journey starts with one small step.", skippable) → dashboard. Returning users go straight to their dashboard.
3. **No pre-populated quests or goals**: remove hardcoded samples and any auto-generation; new accounts start with zero quests and goals; back up and reset demo content as a migration; preserve real accounts; never clear real data on startup or deploy; beautiful empty states.

## What was built

- **Redesign**: new design tokens (`app/globals.css`, `tailwind.config.ts`), light and dark themes (a pre-paint script in `lib/theme-script.ts`; per-device choice in Settings), system font stack with an Inter fallback, pill buttons, cards, iOS segmented controls (`components/ui/tabs.tsx`), grouped lists (`components/ui/list.tsx`), bottom sheets (`components/ui/dialog.tsx`), activity rings on Today, line icons (`components/icons.tsx`) instead of emoji in the interface, soft empty-state illustrations and atmosphere (`components/brand.tsx`), and a storm milestone screen with one lightning flash (`Celebration` in `components/shell.tsx`).
- **Navigation**: Today, Quests, Goals, Cousins (`/league`); a "Life" group with Health, Career, Money, Reflect, Life balance (`/life`) and Together (`/bonding`); plus Profile and Settings. Desktop has a sidebar; phones get a bottom tab bar with a "More" sheet. A single "+" menu offers New quest, New goal and Log an activity. `/habits` redirects to `/quests`.
- **Quests** come in three kinds: Daily (the `Habit` type), One-time (`Todo`), and Challenge (`Challenge`: a target plus a deadline, solo or with cousins, shared or individual target). Quests can link to a goal.
- **Goals**: optional measurable target and unit, optional due date and "why", or simply marked achieved.
- **Accounts**: setup code for the first (organiser) account, invite links for the rest, five-member cap, scrypt passwords, HttpOnly session cookies (30 days, sliding), rate limits, Origin check on writes, password change (signs out other devices), photo upload (resized to 320px JPEG in the browser).
- **Onboarding**: `/onboarding` runs profile → goals → first quest → "You're all set". Middleware plus `GameProvider gate` send people to the right place.
- **Removed**: the five hardcoded sample cousins, base habits auto-assigned to everyone, per-cousin career buttons, the "play as" switcher, the live simulation, and "reset all data".

## Architecture

| Area | Where |
|---|---|
| Game rules (pure, shared by server and client) | `lib/reducer.ts` (`applyAction`, `reduce`, `syncProgress`, `Nope` errors) |
| Scoring, levels, streaks, leaderboard, badges | `lib/engine.ts` |
| Static content and suggestions | `lib/catalog.ts` |
| Types | `lib/types.ts` (`GameState`, `Member`, `Me`, `View`, `StoredGame`) |
| Empty game | `lib/seed.ts` (`emptyGame`, `toStored`) |
| Client state | `lib/store.tsx` (`GameProvider`, `useGame`, `useMember`, `newId`) |
| Storage | `lib/server/db.ts` (`readDb`, `writeDb`, file or Redis backend) |
| Migrations | `lib/server/migrations.ts` (`LATEST_SCHEMA = 2`) |
| Auth | `lib/server/auth.ts` |
| Per-user filtering | `lib/server/view.ts` (`viewFor`) |
| HTTP helpers | `lib/server/http.ts` (`withUser`, `sameOrigin`, `allow` rate limiter, `handleError`) |
| API routes | `app/api/*`: `setup`, `auth/{signup,login,logout}`, `state`, `action`, `profile`, `profile/password`, `avatar/[id]`, `invites`, `invites/check` |
| Route gating | `middleware.ts` (cookie presence only; the APIs verify the session) |
| Route groups | `app/(app)` (signed-in shell), `app/(auth)` (welcome, login, signup), `app/onboarding` |

**Data flow.** The server is the source of truth. The client applies an action optimistically with the same reducer, POSTs it to `/api/action`, and rebases any still-pending actions onto the server's reply. XP toasts and milestone celebrations come from comparing confirmed server states. The client polls `/api/state?rev=N` every 15 seconds and on focus; it gets a tiny "unchanged" reply when nothing moved.

**Storage.** The whole squad is one JSON document: `{schema, rev, meta, users, sessions, invites, game}`. Member profiles live in `users` and are injected into `game.members` when the data is read.
- With `KV_REST_API_URL`/`KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`/`_TOKEN`, or any `<prefix>_KV_REST_API_URL`/`_TOKEN` set, the app uses Upstash Redis over its REST API (keys `tna:db`, `tna:ver`, backups under `tna:backup:*`). Otherwise it uses the file `data/thunderstorms.json`.
- On Vercel with no Redis credentials, it returns a 503 with instructions rather than losing data.
- Writes are compare-and-set with jittered retries, so concurrent instances never overwrite each other. Concurrent loads in one instance share a single read.
- A daily snapshot is kept for 14 days, and a pre-migration backup is written before any migration runs.

## Rules to keep (do not break these)

- **Never pre-populate** quests, goals, logs or profiles. Suggestions in the catalog only pre-fill forms.
- **Never clear or reset data on startup or deploy.** Change stored shapes only through a new numbered migration in `lib/server/migrations.ts` (bump `LATEST_SCHEMA`). Migrations back up first.
- **The server is authoritative.** Clients never send XP amounts. New actions go in the `Action` union and in `ACTION_TYPES`; sanitise every field in `reduce` (`line`, `para`, `int`, `dimOf`) and enforce ownership (`me`). Organiser-only actions go in `ADMIN_ONLY`.
- **Ids** for things a user creates are generated by the client (`newId()`) and validated on the server, so optimistic and server copies match.
- **Privacy.** Personal data (todos, habits, health, mood, reviews, savings notes, slip-up labels) is filtered in `viewFor`. Keep it that way when adding new data.
- **Design.** Stay calm and minimal. Use the tokens (`bg-card`, `text-muted-foreground`, `primary`, `accent` = the lightning colour, used sparingly), `PageHeader`, `Section`, `List`, `Card`, `EmptyState` and line icons; no emoji in the interface chrome. All motion must respect reduced motion (use `motion-safe:` classes, and `useAnimate()` for Recharts).
- **Never commit `data/`** or any `.env*` file.

## Working in this environment

- Windows 11, Node 20.16, Git Bash and PowerShell available. There is **no Vercel CLI and no `gh`**, and no Vercel token. Deploy by pushing to `main`; check build results with the GitHub commit-status API, for example `curl -s https://api.github.com/repos/kssrk34/thunderstorms-n-all/commits/<sha>/status` (context `Vercel`).
- Dev: `npm run dev`. With no accounts, the setup code is printed in the console and stored in `data/thunderstorms.json` under `meta.setupCode`.
- Checks: `npx tsc --noEmit`; `npx next build`. A running dev server locks `.next` on Windows (EPERM), so stop it first. If the build fails with "Cannot find module for page: /_document", delete `.next` and rebuild.
- Stopping `npm run dev` on Windows can leave orphaned `node … next` processes holding port 3000. Find them with `Get-NetTCPConnection -LocalPort 3000`. The owner sometimes runs their own `next dev`, so check its command line before killing anything.
- Visual checks were done by driving headless Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`) over the DevTools protocol with `node --experimental-websocket`, then reading the PNG screenshots. The Redis backend was tested against a small mock of the Upstash REST API with several concurrent Node processes.
- Test accounts must never be created against production. For local testing, use throwaway accounts and delete `data/` afterwards, or point `TNA_DATA_DIR` at a scratch folder.

## Known limitations and ideas

- Quests and goals can be added, completed and deleted, but not edited in place.
- Updates from other cousins arrive by polling (about 15 seconds), not in real time.
- Rate limits are in memory per server instance, so they are looser on serverless.
- The whole squad is one document. Logs grow roughly a few MB a year, which is fine for five people; if it ever gets large, split logs out or archive old ones.
- Put Vercel functions and the Upstash database in the same region (for cousins in India, both in Mumbai: Vercel `bom1`, Upstash `ap-south-1`) to keep requests fast.
- The original brief's remaining sections (4 onward) were never received.
