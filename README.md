# Thunderstorms 'n' All

A private life-gamification app for five cousins: personal quests and goals, XP and levels, streaks, a cousin league, shared challenges and real-life meetups.

Built with Next.js 14 (App Router), React, TypeScript and Tailwind CSS. Each cousin has their own account; everything is stored on the server, so it syncs across devices and cousins see each other's progress.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production
```

### First run

1. Start the server. While there are no accounts, it prints a **setup code** in the console:
   ```
   ⛈  Thunderstorms 'n' All: no accounts yet.
      Setup code for the first cousin: ABCD-1234
   ```
   (Set `TNA_SETUP_CODE` to choose the code yourself.)
2. Open the app, tap **Get Started**, and create the first account with that code. This account is the squad **organiser**.
3. Go to **Settings → Cousins → Invite** to create invitation links for the other four. Each link works once and expires after 7 days. The squad is capped at five accounts.

Every new account starts completely empty: no quests, goals, activity or achievements. Onboarding walks each cousin through their profile, their goals and a first quest (all optional, all their own).

## Hosting

Data is kept in a single JSON file on the server's disk, so the app needs a host with a **persistent filesystem**: a small VPS, Railway, Render or Fly.io with a volume, or a home server. Plain Vercel/Netlify serverless functions do not keep files between requests, so they will not work as-is.

| Variable | Default | Purpose |
|---|---|---|
| `TNA_DATA_DIR` | `./data` | Where the database and backups live. Point this at your persistent volume. |
| `TNA_SETUP_CODE` | random, printed at startup | Code for creating the first account. |

Serve it over HTTPS in production. Session cookies are marked `Secure` automatically when the request arrives over HTTPS (including behind a proxy that sets `X-Forwarded-Proto`).

## Data safety

- `data/thunderstorms.json` is written atomically (temp file, then rename), one write at a time.
- A snapshot is copied to `data/backups/daily-YYYY-MM-DD.json` once a day; the last 14 are kept.
- Schema changes run as numbered migrations in `lib/server/migrations.ts`. Each runs once, and the file is backed up to `data/backups/pre-migration-*.json` first. Normal startup and redeploys never reset or clear data.
- Migration 2 removes demo content left by earlier builds: anything owned by an id that isn't a real account. Real accounts and everything they own are untouched.
- If the database file can't be parsed, the server refuses to start rather than overwrite it.
- The previous version stored a demo game in each browser's localStorage. The new app backs that up under a separate key, removes the demo copy, and offers the backup as a download in Settings.
- `data/` is git-ignored. Never commit it.

## Security

- Passwords are hashed with scrypt and a per-user salt. Sessions are random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie; only a SHA-256 of the token is stored. Sessions last 30 days and slide forward with use; changing your password signs out your other devices.
- Sign-in, sign-up and invite checks are rate-limited. Cross-site writes are rejected by an Origin check.
- The server is the source of truth for the game. Every action is validated and run by the reducer as the signed-in user, so a client can't award itself XP or change another cousin's quests, goals or data. Squad rules (slip-ups) can only be changed by the organiser.
- Each cousin's view is filtered on the server: personal things (one-time quests, health, mood, weekly reviews, savings notes, slip-up details) are only sent to their owner.

## Pages

| Route | What it does |
|---|---|
| `/welcome`, `/signup`, `/login` | Welcome screen, account creation (invite or setup code), sign-in |
| `/onboarding` | Profile → goals → first quest → done |
| `/` | Today: activity rings, today's quests, goals, this week's league, daily spark |
| `/quests` | Daily quests, one-time quests and challenges (solo or with cousins) |
| `/goals` | Personal goals, optionally measurable, linked to quests |
| `/league` | Cousins: standings, squad charge, recent activity, duels, weekly standouts |
| `/health`, `/career`, `/money`, `/reflect`, `/life`, `/bonding` | Life areas: wellness, career reps, savings, mood and reviews, life balance, meetups |
| `/profile` | Your profile, level and achievements |
| `/settings` | Appearance, invitations, squad rules, password, your data |

## Design

Apple-inspired and calm, with a quiet thunderstorm personality: midnight navy, storm grey, cloud white and a muted electric blue, with a lightning accent reserved for XP and milestones. Light and dark modes follow the system (or can be set per device in Settings). All motion respects `prefers-reduced-motion`; milestone screens use a single soft lightning flash that is skipped entirely when reduced motion is on.

## Game design

- **Levels** use lifetime positive XP, so a slip-up never drops your level.
- **Slip-ups** are optional, capped per day, and give a +3 honesty bonus.
- **Underdog boost**: whoever is last this week (and meaningfully behind) earns 1.25× XP.
- **Daily limit** of 8 manual activity logs, to discourage grinding and burnout.
- **Rest day**: one per week protects your streak.

## Code map

- `lib/reducer.ts`: the game rules (pure; run by the server, and by the client for instant feedback)
- `lib/engine.ts`: levels, streaks, scores, leaderboards, badges
- `lib/catalog.ts`: life areas, suggestions, activities, lessons
- `lib/store.tsx`: client state, optimistic updates, syncing with the server
- `lib/server/`: database, migrations, auth, per-user views, HTTP helpers
- `app/api/`: auth, state, actions, profile, invitations, avatars
- `components/`: shell (navigation, sheets, toasts, milestones), forms, brand, UI primitives
