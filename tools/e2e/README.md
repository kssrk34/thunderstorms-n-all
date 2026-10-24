# End-to-end test tools

Local-only scripts used to test the app against a copy of production's shape. Never point them at production: they sign in with the fake password `testpass123` and create accounts.

1. `E2E_DATA_DIR=<scratch dir> node tools/e2e/fixture.js` writes a schema-3 database (4 cousins, ~18 days of history, like the pre-Aura production data).
2. `npx next build`, then `TNA_DATA_DIR=<scratch dir> npx next start -p 3100`. The first request runs migration 4.
3. `node tools/e2e/api.js` runs 44 checks (privacy, ownership, Aura accuracy, characters, notifications), then `node tools/e2e/shared.js` runs 25 more for shared quests, invitations, avatars and notification settings. They mutate the data, so re-copy the fixture to rerun. The fixture is schema 3, so migration 5 would wipe its activity: to keep it, migrate it to 4 with `.test-build/lib/server/migrations.js` (after `npm test`) and set `schema: 5` first.
4. `MSYS_NO_PATHCONV=1 node --experimental-websocket tools/e2e/shoot.js <user> <outdir> 1440x900 / /quests ...` takes screenshots in headless Chrome.
   `interact.js <user> <outdir> <w>x<h> steps.json` scripts clicks, file uploads and screenshots (steps: go, click, files, type, wait, eval, shot).
