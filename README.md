# Thunderstorms 'n' All

A private life-gamification app for five cousins. Your real life is the game: completing quests and habits earns **Aura Points**, every quest belongs to one of ten **Life Balance** dimensions that score themselves, and the whole squad shares one dashboard, a live feed, rivalries and missions.

Built with Next.js 14 (App Router), React, TypeScript and Tailwind CSS. Each cousin has their own account; everything is stored on the server and checked there, so it syncs across devices and nobody can change anyone else's data.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # rules, privacy, migration and notification tests
npm run build && npm start   # production
```

### First run

1. Start the server. While there are no accounts, it prints a **setup code** in the console (set `TNA_SETUP_CODE` to choose it yourself).
2. Open the app, tap **Get Started**, and create the first account with that code. This account is the squad **organiser**.
3. Invite the others from **Profile → Settings → Cousins → Invite**. Each link works once and expires after 7 days. The squad is capped at five.

New accounts start completely empty: no quests, goals, activity or achievements. Onboarding is: identity → choose a character or upload a photo → goals (optional) → a first quest (optional).

### Forgotten passwords

There's no email, so the organiser handles resets. In **Profile → Settings → Cousins**, the key next to a cousin makes a single-use reset link (24 hours). The organiser recovers their own account at **Forgot password? → Use setup code** with `TNA_SETUP_CODE` (at least 8 letters or numbers; paused for an hour after 10 wrong codes). Either way, every other session on that account ends.

## How the game works

### Aura Points

- Earned only by completing something real: a daily quest (habit), a one-time quest, a challenge or mission, a logged activity, a meetup, or progress on a goal. Nothing is random and nothing is free: no daily spark, no bonuses, no multipliers.
- Each quest's Aura is set by effort (Light / Steady / Strong / Intense, or Milestone for one-time quests) and can be fine-tuned within limits: 5–50 for daily quests, 5–100 for one-time quests. Challenges pay 25 / 100 / 200 for a day / 7 days / 30 days. Meetups pay 75 each, or 100 when the whole squad is there. Logged activities pay a fixed rate per 30 minutes (half to double for shorter or longer).
- Every award is an entry in the ledger (**Profile → Aura**) with a unique claim (`ref`), so the same thing can never be counted twice, even if a request arrives twice. Undoing a quest removes exactly its entry. Goal progress only pays for new ground, so stepping back and forward again earns nothing.
- Levels come from lifetime Aura and never go down.

### Life Balance (ten dimensions)

Health and Fitness, Intellectual Life, Emotional Life, Character, Spiritual Life, Social Life, Financial Life, Career, Quality of Life, and **Life Vision**, which is calculated from the other nine. Nobody types in a score.

```
score = completed weight ÷ max(planned weight, 10 × days tracked)
```

- Weight is a quest's Aura, so harder commitments count for more. A quest in two dimensions splits its weight evenly.
- A habit is planned on each day it's due (rest days excepted). Today counts only once it's done.
- A one-time quest counts when it's completed, or as missed once it has been open for 7 days.
- Challenges count when they finish, with partial credit if they ended short. Logged activities and meetups count as planned and done.
- The floor of 10 Aura a day stops very easy tasks from maxing an area.
- With fewer than 3 planned items or 3 days of tracking, the score is "Not enough data".
- **Life Vision** is the average of the nine (untracked areas count as zero), so it rewards breadth. It needs three tracked areas.
- Retiring a habit keeps its history; only brand-new, unused quests are deleted outright. That way nobody can raise a score by deleting what they missed.

Scores are shown for the last 7 days, 30 days and all time, with the previous period for comparison. The code is in `lib/balance.ts`.

### Streaks, ranks, achievements

- A **streak** counts days with any completed action, plus one rest day a week. Every 7 days in a row earns a **shield** (up to two); a missed day spends a shield instead of breaking the streak.
- **Rank** (Mist → Drizzle → Squall → Cyclone → Thunderhead → Lightning → Stormborn, three divisions each) comes from the last 30 days: half Life Vision, half consistency. It can go down if you stop, which is the point of a rank. Levels can't.
- **Achievements** include first 100 Aura, seven days of commitments, a 30-day streak, a first mission with cousins, and 50% in all nine areas. Some unlock **avatar frames**. Badges from earlier versions stay with whoever earned them.

### Together

- **Dashboard**: all five cousins side by side (Aura, level, rank, today and this week, streak, overall balance), today's mission (top three, habits due, daily objective, shared challenges), the live feed, and all ten dimensions compared cousin by cousin.
- **Feed**: completions people chose to share, plus level-ups, badges, streak milestones and daily objectives. Cousins can react (no editing).
- **Rivalries**: optional weekly races (most Aura, most active days, or most Aura in one dimension). Winners get a trophy and a badge, not extra Aura.
- **Missions**: a target with a deadline. *Team*: everyone must hit their own target, then everyone earns the reward. *Shared*: one total. *Race*: each for themselves. Progress is counted automatically from completed quests in the mission's dimension, or logged by hand.
- **Weekly recap** (`/recap`): last week's Aura, quests, strongest and weakest dimensions, change against the week before, and the squad's big moments. It can be shared as an image.

## Privacy and permissions

- Every action goes through the reducer as the signed-in cousin (`lib/reducer.ts`), which only lets you change your own quests, goals, progress and reactions. Profile changes only ever touch the caller. Tests in `tests/` try to break this.
- Each cousin's view is filtered on the server (`lib/server/view.ts`). Shared: profiles, Aura totals, achievements, shared goals, challenges, rivalries, meetups, the feed, and **aggregated** Life Balance scores. Only sent to the owner: habits and one-time quests, private goals, today's priorities, notes, money amounts (money goals show cousins a percentage), phone numbers, and anything personal from earlier versions.
- Quests, goals and activities can be private. Cousins then see the Aura and dimension (which their totals are made of), never the title. Emotional and financial items start out private. A "Share my activity" switch hides all completions.

## Notifications

In-app notifications (the bell) always work. WhatsApp and browser push are **off until each cousin opts in** (Profile → Alerts), and both need credentials on the server. Without them, the app records messages as clearly labelled **simulations**, so cousins can preview what they'd get, and never claims anything was sent.

How it works (`lib/server/notify.ts`): messages go into an outbox stored with the data, one per event per channel, deduplicated by key. Each cousin's quiet hours delay messages, and their daily limit (1–5) drops extras as "skipped". Delivery happens on the server, claimed with a write so two instances never send the same message, and is retried on temporary errors. The status moves through queued → sending → sent → delivered/read, or failed with the reason. Messages carry only what the recipient may know.

Kinds: daily reminder (only if quests are left), a cousin passing your weekly Aura, a challenge or mission completed, a group challenge ending tomorrow, and the weekly recap.

### WhatsApp (Meta WhatsApp Business Platform, Cloud API)

1. Set up a WhatsApp Business account and phone number in Meta Business Suite, and create an app with the WhatsApp product.
2. In WhatsApp Manager, create and get approval for these templates (language `en`, or set `WHATSAPP_TEMPLATE_LANG`). Body text and parameters:

   | Template | Category | Body |
   |---|---|---|
   | `tna_verify` | Authentication | `{{1}} is your verification code.` (with a copy-code button) |
   | `tna_daily_quests` | Utility | `Your daily quests are waiting, {{1}}. {{2}} quests and {{3}} Aura Points are up for grabs today.` |
   | `tna_overtaken` | Utility | `{{1}} just passed your weekly Aura Points score. You're {{2}} behind. Plenty of week left.` |
   | `tna_challenge_done` | Utility | `You've completed {{1}}! +{{2}} Aura Points.` |
   | `tna_challenge_ending` | Utility | `The group challenge {{1}} ends tomorrow.` |
   | `tna_weekly_recap` | Utility | `Your weekly Life Balance recap is ready, {{1}}.` |
   | `tna_test` | Utility | `This is a test from Thunderstorms 'n' All. Your notifications are set up.` |

   Adding "Reply STOP to unsubscribe." to each body is a good idea; replying STOP turns WhatsApp off for that cousin.
3. Set `WHATSAPP_ACCESS_TOKEN` (a permanent system-user token) and `WHATSAPP_PHONE_NUMBER_ID`.
4. Webhook (delivery receipts and STOP replies): in the app dashboard, set the callback URL to `https://<your-domain>/api/whatsapp/webhook`, choose a verify token and set it as `WHATSAPP_VERIFY_TOKEN`, set `WHATSAPP_APP_SECRET` (requests without a valid signature are refused), then subscribe to `messages`.

Cousins then add their number (+91 by default), confirm the six-digit code sent on WhatsApp, and opt in. Numbers are never shown to other cousins. Each cousin also gets a one-tap unsubscribe link.

### Browser push and installing the app

The site is a PWA: it can be installed to the home screen (Profile → Settings → Install). On iPhone, push works only after installing it. To turn on push, generate keys with `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:you@example.com`).

### Scheduled reminders

Reminders are checked while cousins use the app (at most every 10 minutes), and once a day by Vercel Cron (`vercel.json`, 09:00 India time). Set `CRON_SECRET` in Vercel to enable the cron route; without it, the route stays off.

## Hosting

The squad's data is one small JSON document.

- **Vercel (or any serverless host): Upstash Redis.** In the Vercel project, open **Storage**, add an Upstash Redis database, connect it, and redeploy. The app finds the credentials automatically (`KV_REST_API_*`, `UPSTASH_REDIS_REST_*`, or a custom `<prefix>_KV_REST_API_*`). Without them it refuses to start on Vercel rather than lose data.
- **Anywhere with a persistent disk**: a JSON file in `TNA_DATA_DIR`.

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis REST credentials (Vercel sets these) |
| `TNA_SETUP_CODE` | Code for the first account; afterwards the organiser's recovery key. Keep it private. |
| `TNA_DATA_DIR` | File storage location when Redis isn't configured (default `./data`) |
| `TNA_REDIS_PREFIX` | Key prefix if the Redis database is shared (default `tna`) |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Turn on WhatsApp delivery |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Webhook signature check and setup |
| `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_API_VERSION`, `WHATSAPP_VERIFY_TEMPLATE` | Optional overrides (`en`, `v21.0`, `tna_verify`) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Turn on browser push |
| `CRON_SECRET` | Lets Vercel Cron call `/api/cron` for daily reminders |

The game day runs on India time (UTC+5:30) wherever the server runs, so a habit done at 1 am counts for the right day. Serve the app over HTTPS in production.

## Data safety

- Every write is all-or-nothing with compare-and-set, so concurrent server instances never overwrite each other. A daily snapshot is kept for 14 days, and a `pre-migration-*` backup is written before any migration runs.
- Schema changes are numbered migrations in `lib/server/migrations.ts`. Normal startup and redeploys never reset data.
  - Migration 2 removed demo content; migration 3 added password reset links.
  - **Migration 4** (Aura Points and ten dimensions) maps the old twelve life areas onto the new dimensions (Mind → Intellectual, Money → Financial, Family and Friends → Social, Creativity and Adventure → Quality of Life, Giving → Character, Inner Calm → Spiritual; items filed under Vision move to Character, because Life Vision is now calculated). It marks history that used to be personal (one-time quests, savings, health logs, mood and reviews, slip-ups) as private, turns duels into rivalries, maps emoji icons to line icons, sets each goal's high-water mark, and starts the feed from the last two weeks of shareable completions. It deletes nothing: retired data such as health logs, mood, reviews, savings, interests and self-ratings stays stored, just no longer shown.
  - **Migration 5** (2026-10-19, at the owner's request) is a one-time fresh start: it clears every cousin's activity (quests, goals, history, feed, achievements, notifications and all retired data) and keeps every account: login, name, photo, character, bio, roles, phone and notification settings, sessions and invitations. It runs once, after a `pre-migration-v4-*` backup that holds the old data.
- If the stored data can't be parsed, the server refuses to continue rather than overwrite it. `data/` is git-ignored; never commit it.

## Security

- Passwords: scrypt with a per-user salt. Sessions: random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie; only a hash is stored. 30 days, sliding.
- Cross-site writes are rejected by an Origin check. Sign-in, sign-up, resets, phone codes and actions are rate-limited. Organiser recovery has a limit stored with the data, so it holds across instances.
- Phone codes and reset tokens are stored only as hashes. The WhatsApp webhook verifies Meta's signature, and the cron route needs `CRON_SECRET`.

## Pages

| Route | What it does |
|---|---|
| `/welcome`, `/signup`, `/login`, `/forgot`, `/reset` | Welcome, account creation, sign-in, password recovery |
| `/onboarding` | Identity → avatar → goals → first quest |
| `/` | Dashboard: the five cousins, today's mission, live feed, ten-dimension comparison, squad pulse |
| `/quests` | My Quests: today, habits (with retired ones), one-time quests, goals |
| `/life` | Life Balance: storm wheel, radar, every dimension with what fed it, trend, how it's calculated |
| `/arena` | Leaderboard, rivalries, missions, and Together (meetups and memories) |
| `/profile` | Identity, rank, frames, achievements, Aura history, alerts, settings |
| `/u/[username]` | A cousin's profile, read-only |
| `/recap` | Weekly recap, shareable as an image |

Old routes (`/goals`, `/league`, `/bonding`, `/settings`, `/health`, `/career`, `/money`, `/reflect`, `/habits`) redirect to their new homes.

## Design

A dark, cinematic storm refined like Apple hardware: midnight navy and graphite surfaces, electric blue for actions, lightning violet and cool cyan for energy, and warm amber reserved for achievements. Each dimension has its own restrained accent colour. The display face is Space Grotesk, with Inter for body text. Characters, rank emblems and frames are original SVG artwork (`components/avatars.tsx`). Motion: occasional faint lightning behind the clouds, an electric charge on the Aura counter, sparks when you check something off, drawn lightning on level-ups, and slowly turning electric borders on rare achievements. Everything decorative respects `prefers-reduced-motion` and can be switched off per device (Profile → Settings), along with sound. Light mode remains available.

## Code map

- `lib/reducer.ts`: game rules and every action (pure; run by the server, and by the client for instant feedback)
- `lib/balance.ts`: Life Balance scoring · `lib/engine.ts`: levels, streaks, ranks, rivalries, achievements · `lib/stats.ts`: the aggregates shared about each cousin · `lib/ledger.ts`: per-cousin index over the Aura ledger
- `lib/catalog.ts`: dimensions, characters, frames, ranks, effort presets, suggestions
- `lib/store.tsx`: client state, optimistic updates, polling (12 s), Aura feedback
- `lib/server/`: storage, migrations, auth, per-user views, notifications (`notify.ts`, `whatsapp.ts`, `push.ts`, `events.ts`)
- `components/`: shell, dashboard comparison, feed, forms, cropper, avatars, profile, alerts, settings
- `tests/`: `node:test` suites for rules, privacy, migration and notifications (`npm test`)
