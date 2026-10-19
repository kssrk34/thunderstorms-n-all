# Thunderstorms 'n' All: project handoff

Context for continuing this project in a new session. Read this first, then `README.md` for setup, game rules and hosting. Last updated 2026-10-19.

## What it is

A private life-gamification web app for five cousins (Hyderabad and Bangalore, in their 20s). Your real life is the game: completed quests earn **Aura Points** (formerly XP), quests feed ten **Life Balance** dimensions that score themselves, and the squad shares one dashboard, a feed, rivalries and missions. Owner: GitHub `kssrk34`.

- Repo: https://github.com/kssrk34/thunderstorms-n-all (appears public, so never commit secrets or user data)
- Live: https://thunderstorms-n-all.vercel.app
- Stack: Next.js 14.2.35 App Router, React 18, TypeScript, Tailwind 3, Radix primitives, Recharts, lucide-react, plus `react-easy-crop` (photo cropping) and `web-push` (push encryption, server only).

## Current state

- `main` is production. **Every push to `main` deploys to Vercel production**; other branches get preview deploys. Vercel deploys through its GitHub integration.
- **Production runs the second-brief evolution** (commit `9fe0ddc`, deployed 2026-10-19 by fast-forwarding `aura-evolution` into `main`; the next commit only adds `docs/Thunderstorms-n-All-Feature-Guide.pdf`, which describes the *previous* version). Migration 4 ran on the first request after deploy; the pre-migration backup is in Redis under `tna:backup:pre-migration-v3-*`. `/api/setup` afterwards still reported `members: 4`.
- Production has **4 real accounts**. Treat production data as real. Branch `aura-evolution` is merged and can be deleted.
- Preview deploys probably share production's Upstash database (Vercel connects storage to all environments by default). Before testing anything that migrates data on a preview, disconnect preview from the production database in Vercel.
- Vercel has `TNA_SETUP_CODE` and Upstash set. WhatsApp, VAPID and `CRON_SECRET` are **not** set, so notifications run as labelled simulations, push is unavailable, and the daily cron returns 503.
- The fifth cousin hasn't joined yet (one open spot).

## The briefs

1. **First brief** ("website redesign and functional improvements", cut off in section 3): Apple-inspired redesign, real accounts and onboarding, no pre-populated content. Done in earlier sessions.
2. **Second brief** (2026-10-19, "major product evolution", 11 sections plus acceptance criteria): Aura Points; ten automatic Life Balance dimensions; a shared five-cousin dashboard with per-dimension comparisons; original character avatars and photo cropping; a premium dark thunderstorm UI; removing Interests, Reflect and Daily Spark and simplifying navigation to Dashboard, My Quests, Life Balance, Arena, Profile; engagement features (mission center, feed with reactions, rivalries, collaborative missions, recoverable streaks, achievements, weekly recap); phone and WhatsApp notifications through the official platform with consent, limits, quiet hours, dedupe and honest simulation; PWA and push; secure ownership; data preserved through migrations. Built on `aura-evolution`.

## Decisions made on the second brief (tell the owner; reversible)

- **Retired pages**: Health, Career, Money and Reflect are gone (redirect to `/life`); their data is kept. Water and sleep became quest ideas, and career logs and savings became "Log an activity" types. The brief's Life Balance has to be driven by quests, and these trackers awarded Aura outside that.
- **Removed Aura sources**: Daily Spark, the honesty bonus, slip-ups (penalties), money-lesson taps, mood, gratitude and weekly-review Aura, and the 1.25× underdog multiplier. These are random, free, or make "+30" not mean +30. Past entries stay in the ledger.
- **Life Vision** items were refiled under Character (Life Vision is calculated now).
- **Visibility**: quests default to shared, except Emotional and Financial (private). Migrated one-time quests are private, as they were before.
- **Characters** are unique per cousin. Badge frames are cosmetic only. Rivalry winners get a trophy and badge, not Aura.
- **Dark is the default theme**; light and automatic remain options.

## What was built (second brief)

- **Aura ledger**: every award is a `LogEntry` with a unique `ref`; activities and creates carry client ids, so repeats are no-ops. Goal steps pay only beyond `peak` (this fixed an old +/− farming exploit). Undo removes exactly the claim and its feed post.
- **Life Balance** (`lib/balance.ts`): completed ÷ max(planned, 10 × tracked days), weighted by Aura, split for two-dimension quests, null below 3 items or 3 days; Life Vision is the mean of nine with zeros and needs three tracked. Habits are archived (`archivedOn`), not deleted, once used, so history can't be gamed away.
- **Stats** (`lib/stats.ts`): `MemberStats` per cousin (7, 30 and all-time scores plus previous periods, 8-week trend, consistency, rank score, objective). The server shares these instead of other cousins' habits; the client recomputes its own locally.
- **Engine**: streak shields (one per 7 days in a row, max 2), rank tiers and divisions, rivalries, a new badge set (old badges kept as "legacy" if earned), daily plan and auto objective.
- **Reducer actions**: habit and todo add, edit and archive (`habitRemove` archives), activity (with `id`), `logUndo` (today's activities), `prioritize` (top three), challenges with `scope` solo/team/squad and `track` manual/quests, rivalries, reactions, goal edit. Challenge awards come from `syncChallenges` (set/unset by ref while running, frozen after the end). Feed events are created in the reducer; personal notifs use `to`.
- **Server side effects** (`lib/server/events.ts`): overtakes and completed missions (in-app plus outbox), and the reminder schedule (opportunistic every 10 minutes and from the daily cron).
- **Notifications** (`lib/server/notify.ts`, `whatsapp.ts`, `push.ts`; routes under `app/api/notify/*`, `app/api/whatsapp/webhook`, `app/api/cron`): consent, dedupe, quiet hours, daily limit, lease-based delivery, retries, receipts, STOP handling, unsubscribe links, verified phone codes (hashed). Simulated when unconfigured.
- **UI**: the new shell and five-item navigation (`components/shell.tsx`); the dashboard (`app/(app)/page.tsx`, `components/compare.tsx`, `components/feed.tsx`); Life Balance (`components/wheel.tsx`); Arena; Profile with tabs; cousin pages `/u/[username]`; `/recap` (canvas share image); SVG characters, frames and rank emblems (`components/avatars.tsx`); the cropper (`components/cropper.tsx`); storm effects (`components/brand.tsx`); sounds (`lib/sound.ts`); device prefs (`lib/device.ts`); PWA (`app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icons/`).
- **India time**: `today()` in `lib/utils.ts` always uses UTC+5:30. Vercel runs in UTC, which used to misdate anything done between midnight and 5:30 am.

## Architecture

| Area | Where |
|---|---|
| Game rules (pure, shared by server and client) | `lib/reducer.ts` (`applyAction`, `reduce`, `syncProgress`, `Nope`) |
| Life Balance / engine / stats / ledger index | `lib/balance.ts`, `lib/engine.ts`, `lib/stats.ts`, `lib/ledger.ts` |
| Static content | `lib/catalog.ts` (dims, characters, frames, ranks, effort, ideas, activities) |
| Types | `lib/types.ts` (`GameState`, `Member`, `Me`, `View` with `stats`, `NotifyPrefs`, `OutboxItem`) |
| Client state | `lib/store.tsx` (`GameProvider`, `useGame` with `stats(id)` and `surge`, `newId`) |
| Storage / migrations | `lib/server/db.ts` (adds `outbox`), `lib/server/migrations.ts` (`LATEST_SCHEMA = 4`) |
| Per-user filtering | `lib/server/view.ts` (`viewFor`, cached `squadStats`) |
| Tests | `tests/*.test.ts` via `npm test` (compiled to `.test-build/`, git-ignored) |

**Data flow** is unchanged: optimistic client actions with the same reducer (`scope: "self"`, so the client only syncs its own badges and objectives), POST `/api/action`, rebase pending actions; polling `/api/state?rev=N&day=YYYY-MM-DD` every 12 s and on focus.

## Rules to keep (do not break these)

- **Aura only for real completions.** No random, free or multiplied Aura. New sources need a unique `ref` per claim and must go through `award`/`setRef`.
- **Never pre-populate** quests, goals, logs or profiles. Suggestions only pre-fill forms.
- **Never clear or reset data on startup or deploy.** Change stored shapes only through a new numbered migration (bump `LATEST_SCHEMA`). Migrations back up first. Keep retired data stored.
- **Life Balance is calculated, never entered.** No action may set a score.
- **The server is authoritative.** New actions go in `Action` and `ACTION_TYPES`; sanitise every field; enforce ownership (`me`).
- **Privacy.** Other cousins get aggregates (`MemberStats`), redacted private log labels, and percentages for money goals. Never send habits, todos, priorities, notes, phone numbers or outbox items for other users. Add new personal data to `viewFor`'s filters, and to `tests/server.test.ts`.
- **Notifications need consent.** Off by default, opt-in per channel and kind, never claim delivery without a provider response, and no private data of others in messages.
- **Design.** Use the tokens (`primary` electric blue, `arc` violet, `ion` cyan, `accent` amber for achievements only), `panel`, `PageHeader`, `Section`, line icons; no emoji in the UI chrome. All decorative motion must respect reduced motion and the `fx` / `fx-off` switch (`motionAllowed()`, `useAnimate()` for Recharts).
- **Next.js route and page files** may only export what Next allows (default, `GET`/`POST`, `dynamic`, `metadata`, …). Put shared helpers elsewhere.
- **Never commit `data/`** or any `.env*` file.

## Working in this environment

- Windows 11, Node 20.16, Git Bash and PowerShell. **No Vercel CLI and no `gh`**, and no Vercel token. Deploy by pushing to `main`; check builds with `curl -s https://api.github.com/repos/kssrk34/thunderstorms-n-all/commits/<sha>/status` (context `Vercel`).
- Checks: `npm test`; `npx tsc --noEmit`; `npx next build` (stop any dev server first, since it locks `.next` on Windows; delete `.next` if you see stale-type errors).
- End-to-end testing used `next start` with `TNA_DATA_DIR` pointing at a scratch folder holding a production-shaped schema-3 fixture, plus headless Chrome over the DevTools protocol (`node --experimental-websocket`). In Git Bash, prefix commands that take URL paths with `MSYS_NO_PATHCONV=1`. Radix tabs activate on `mousedown`, so synthetic clicks must send pointer events.
- Stopping servers on Windows can leave orphaned `node … next` processes; find them with `Get-NetTCPConnection -LocalPort <port>` and check the command line before killing anything (the owner sometimes runs their own `next dev`).
- Never create test accounts against production.

## Known limitations and ideas

- Updates arrive by polling (about 12 seconds), not in real time.
- WhatsApp and push need the owner to set credentials (README). The daily cron needs `CRON_SECRET`. Without it, reminders only go out while someone has the app open.
- Rate limits are in memory per instance (looser on serverless); organiser recovery and phone-code sends are also limited in the database.
- The first action after migration 4 will post a burst of newly earned badges to the feed (the new badge set judged against existing history).
- `TNA_SETUP_CODE` doubles as the organiser's recovery key, and the organiser can reset any cousin's password.
- The whole squad is one document. Fine for five people; split logs out if it ever grows large.
- Put Vercel functions and Upstash in the same region (Mumbai: Vercel `bom1`, Upstash `ap-south-1`).
