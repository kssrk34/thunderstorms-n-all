// End-to-end checks for shared quests, invitations, avatars and notification settings against the running server (port 3100).
// Run after api.js (or on any copy of the fixture); it creates its own quests.
const BASE = "http://localhost:3100";
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures++; };
const rid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

async function login(username) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "testpass123" }) });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  if (!r.ok || !cookie) throw new Error(`login ${username} failed: ${r.status}`);
  const call = async (path, init = {}) => {
    const res = await fetch(BASE + path, { ...init, headers: { cookie, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) }, body: init.body ? JSON.stringify(init.body) : undefined });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  return { call, act: (action) => call("/api/action", { method: "POST", body: { action } }), state: async () => (await call("/api/state")).data };
}
const auraOf = (v, id) => v.game.logs.filter((l) => l.userId === id && l.xp > 0).reduce((a, l) => a + l.xp, 0);

(async () => {
  const [asha, bala, chitra, dev] = await Promise.all(["asha", "bala", "chitra", "dev"].map(login));
  const A = (await asha.state()).me.id, B = (await bala.state()).me.id, C = (await chitra.state()).me.id, D = (await dev.state()).me.id;

  // ---------- avatars ----------
  const img = await fetch(`${BASE}/avatars/avatar-storm-blue.webp`);
  check(img.status === 200 && /image\/webp/.test(img.headers.get("content-type") || ""), "Character portraits are served as WebP");
  const chars = (await asha.state()).game.members.map((m) => m.character).filter(Boolean);
  check(chars.length === new Set(chars).size && chars.every((c) => c.startsWith("storm-")), `Every character is one of the five portraits and unique (${chars.join(", ")})`);

  // ---------- invitations ----------
  const habitId = rid(), shareId = rid();
  await asha.act({ t: "habitAdd", id: habitId, habit: { title: "Read 20 minutes together", dim: "intellectual", xp: 20 } });
  const made = await asha.act({ t: "shareCreate", id: shareId, source: { type: "habit", id: habitId }, mode: "together", invite: [B, C, A, "nobody00"] });
  check(made.status === 200 && made.data.game.shares.some((s) => s.id === shareId), "Asha shares her habit with Bala and Chitra");
  check(Object.keys(made.data.game.shares.find((s) => s.id === shareId).members).sort().join() === [A, B, C].sort().join(), "Self-invitations and unknown ids are dropped");
  const again = await asha.act({ t: "shareCreate", id: shareId, source: { type: "habit", id: habitId }, mode: "together", invite: [D] });
  check(again.status === 200 && !again.data.game.shares.find((s) => s.id === shareId).members[D], "Repeating the same create changes nothing");

  let vB = await bala.state();
  const inv = vB.game.notifs.find((n) => n.ref === `share:${shareId}`);
  check(!!inv && inv.from === A && /\/quests\?tab=shared/.test(inv.link || ""), "Bala gets an invitation notification from Asha that links to it");
  check(vB.game.shares.find((s) => s.id === shareId)?.members[B].status === "pending", "Bala sees it as pending");
  check(!vB.game.habits.some((h) => h.shareId === shareId), "Nothing joins Bala's quests before he accepts");
  const vD = await dev.state();
  check(!vD.game.shares.some((s) => s.id === shareId) && !JSON.stringify(vD).includes("Read 20 minutes together"), "Dev, who wasn't invited, sees nothing of it");

  const copyB = rid();
  vB = (await bala.act({ t: "shareRespond", id: shareId, accept: true, copyId: copyB })).data;
  check(vB.game.habits.some((h) => h.id === copyB && h.shareId === shareId), "Accepting gives Bala his own copy");
  const vC = (await chitra.act({ t: "shareRespond", id: shareId, accept: false })).data;
  check(vC.game.shares.find((s) => s.id === shareId).members[C].status === "declined" && !vC.game.habits.some((h) => h.shareId === shareId), "Chitra declines and gets nothing added");
  const vA = await asha.state();
  check(vA.game.notifs.some((n) => n.from === B && /joined/.test(n.title)), "Asha is told Bala joined");

  // ---------- ownership and Aura ----------
  const before = auraOf(await asha.state(), B);
  await asha.act({ t: "habit", habitId: copyB });
  check(auraOf(await asha.state(), B) === before, "Asha can't complete Bala's copy");
  await bala.act({ t: "habit", habitId: copyB });
  check(auraOf(await bala.state(), B) === before + 20, "Bala's completion earns him exactly 20 Aura");
  const edit = (await bala.act({ t: "habitEdit", id: copyB, habit: { title: "Bala's version", xp: 50, remindAt: 21 } })).data.game.habits.find((h) => h.id === copyB);
  check(edit.title === "Read 20 minutes together" && edit.xp === 20 && edit.remindAt === 21, "Bala can set his own reminder but can't change the shared habit");
  const ended = (await bala.act({ t: "shareEnd", id: shareId })).data.game.shares.find((s) => s.id === shareId);
  check(!ended.endedOn, "Only the organiser can end it");
  await asha.act({ t: "habit", habitId: habitId });
  check((await bala.state()).game.feed.some((e) => e.kind === "together" && e.ref?.startsWith(`sqall:${shareId}`)), "Everyone done today: the group moment reaches participants");
  check(!(await dev.state()).game.feed.some((e) => e.ref?.startsWith(`sqall:${shareId}`)), "…and not Dev");

  // ---------- team quests ----------
  const h2 = rid(), s2 = rid(), cb = rid();
  await asha.act({ t: "habitAdd", id: h2, habit: { title: "Team workouts", dim: "health", xp: 30 } });
  await asha.act({ t: "shareCreate", id: s2, source: { type: "habit", id: h2 }, mode: "team", target: 2, bonus: true, invite: [B] });
  await bala.act({ t: "shareRespond", id: s2, accept: true, copyId: cb });
  const b0 = auraOf(await bala.state(), B);
  await bala.act({ t: "habit", habitId: cb });
  await asha.act({ t: "habit", habitId: h2 });
  const vT = await bala.state();
  const bonus = vT.game.shares.find((s) => s.id === s2).bonus;
  check(auraOf(vT, B) === b0 + 30 + bonus, `Team target met: Bala earns his completion plus the ${bonus} bonus, once`);
  check(vT.game.notifs.some((n) => /Team quest complete/.test(n.title)), "Participants are told the team quest is complete");

  // ---------- leaving ----------
  const left = (await bala.act({ t: "shareLeave", id: shareId })).data;
  check(left.game.shares.find((s) => s.id === shareId).members[B].status === "left" && auraOf(left, B) >= before + 20, "Bala leaves and keeps the Aura he earned");

  // ---------- notification settings ----------
  const n1 = await dev.call("/api/notify", { method: "PATCH", body: { kinds: { invites: false, daily: false } } });
  check(n1.status === 200 && n1.data.prefs.kinds.invites === false && !("daily" in n1.data.prefs.kinds), "Notification categories save; retired kinds are ignored");
  check(Object.keys(n1.data.prefs.kinds).length === 8, "Eight categories, as in the brief");
  const r1 = await dev.call("/api/notify/receipt", { method: "POST", body: { id: "nosuchid1" } });
  check(r1.status === 200 && r1.data.updated === false, "A receipt for someone else's or an unknown message changes nothing");
  const r2 = await dev.call("/api/notify/receipt", { method: "POST", body: { id: "<script>" } });
  check(r2.status === 400, "Malformed receipts are refused");

  console.log(failures ? `\n${failures} FAILED` : "\nAll shared-quest checks passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
