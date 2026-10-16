# ⛈️ Thunderstorms 'n' All

A gamified life-management demo for five cousins: quests, XP, streaks, a cousin league, and real-life meetups.

Built with Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui-style components (Radix), and Recharts. There's no backend: all data lives in the browser's `localStorage`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Deploy: push to GitHub and import the repo in Vercel. No env vars are needed.

## Pages

| Route | What it does |
|---|---|
| `/` | Dashboard: level/XP, today's quests and to-dos, streak with rest day, Thunder Meter (squad goal), Surprise Bolt, live cousin feed, charts |
| `/quests` | Solo and squad challenges (daily/weekly/monthly), templates, create, join, log progress |
| `/league` | Leaderboard by XP, streak, consistency or badges over day/week/month/all-time; podium, trophies, duels |
| `/habits` | Habit manager with 14-day strips, 5-week consistency heatmap, goals and milestones |
| `/life` | 12 life areas radar (compare with a cousin), self-ratings, suggestions |
| `/bonding` | Record meetups (full-squad and travel bonuses), memory wall with cheers, connection web, timeline |
| `/health` | Water, sleep, workouts, South Indian vegetarian mindful-plate tracker, weekly wellness |
| `/career` | Role-specific quick logs, skill tree, career goals, accountability board |
| `/money` | Savings target and log, 50/30/20 planner, literacy lessons, squad race (% of own target) |
| `/reflect` | Mood/energy check-in, gratitude wall, weekly review, auto-generated insights |
| `/settings` | Avatar unlocks, gentle penalties config, cousin profiles, live-simulation toggle, reset |

## Game design

- **Levels** use lifetime positive XP, so a slip-up never drops your level.
- **Slip-ups** are optional, capped per day, and give a +3 honesty bonus.
- **Underdog Surge**: whoever is last this week (and meaningfully behind) earns 1.25× XP.
- **Daily cap** of 8 manual logs, to discourage grinding and burnout.
- **Rest day**: one per week protects your streak.
- **Live sim**: other cousins act every ~25 s so the league moves during a demo. You can turn this off in Settings.

## Code map

- `lib/catalog.ts`: cousins, 12 dimensions, habits, activities, meals, lessons
- `lib/engine.ts`: levels, streaks, scores, leaderboards, badges
- `lib/store.tsx`: reducer, XP awarding, persistence, celebrations, live simulation
- `lib/seed.ts`: 35 days of generated sample history
- `components/shell.tsx`: sidebar, mobile nav, notifications, toasts, celebration overlay, log dialog
