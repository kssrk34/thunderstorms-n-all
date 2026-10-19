// End-to-end checks against the running server: privacy, ownership, Aura accuracy, profile rules, notifications.
const BASE = "http://localhost:3100";
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures++; };

async function login(username) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "testpass123" }) });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  if (!r.ok || !cookie) throw new Error(`login ${username} failed: ${r.status}`);
  const call = async (path, init = {}) => {
    const res = await fetch(BASE + path, { ...init, headers: { cookie, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) }, body: init.body ? JSON.stringify(init.body) : undefined });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  return { cookie, call, act: (action) => call("/api/action", { method: "POST", body: { action } }) };
}

(async () => {
  const asha = await login("asha");
  const dev = await login("dev");
  const bala = await login("bala");

  // ---------- privacy ----------
  const vDev = (await dev.call("/api/state")).data;
  const json = JSON.stringify(vDev);
  check(vDev.game.habits.every((h) => h.userId === "u4dev"), "Dev only receives his own habits");
  check(vDev.game.todos.every((t) => t.userId === "u4dev"), "Dev only receives his own one-time quests");
  check(!json.includes("Book the dentist"), "Asha's private to-do title never reaches Dev");
  check(!/Mood check-in|Gratitude journal|Rain after/.test(json), "Chitra's mood and gratitude never reach Dev");
  check(json.includes("Swiggy") && json.includes("40000"), "Dev still sees his own savings note and fund amount");
  const vAsha = (await asha.call("/api/state")).data;
  const ja = JSON.stringify(vAsha);
  check(!ja.includes("Swiggy") && !ja.includes("2,000"), "Dev's savings amount and note never reach Asha");
  const fund = vAsha.game.goals.find((g) => g.id === "g4fund");
  check(fund && fund.unit === "%" && fund.target === 100 && !ja.includes('"current":40000'), `Asha sees Dev's money goal only as a percentage (${fund && fund.current}%)`);
  check(!ja.includes("Doomscrolling"), "Dev's slip-up detail never reaches Asha");
  check(Object.keys(vAsha.stats).length === 4 && vAsha.stats.u4dev.b30 && !("habits" in vAsha.stats.u4dev), "Everyone's Life Balance arrives as aggregates only");
  check(!ja.includes("passHash") && !ja.includes("sessions"), "No credentials or sessions in views");

  // ---------- ownership ----------
  const before = JSON.stringify((await asha.call("/api/state")).data.game.habits);
  for (const a of [{ t: "habit", habitId: "h1read" }, { t: "habitEdit", id: "h1read", habit: { xp: 50, title: "hacked" } }, { t: "habitRemove", habitId: "h1read" }, { t: "todo", id: "t1tax" }, { t: "todoDel", id: "t1tax" }, { t: "goalStep", id: "g1books", amount: 9 }, { t: "goalDel", id: "g1books" }]) {
    await dev.act(a);
  }
  const after = (await asha.call("/api/state")).data.game;
  check(JSON.stringify(after.habits) === before, "Dev's attempts to complete, edit or retire Asha's habit change nothing");
  check(after.todos.some((t) => t.id === "t1tax" && !t.done), "Dev can't complete or delete Asha's to-do");
  check(after.goals.find((g) => g.id === "g1books").current === 3, "Dev can't move Asha's goal");
  const bad = await dev.call("/api/profile", { method: "PATCH", body: { userId: "u1asha", name: "Hacked" } });
  check(bad.status === 200 && bad.data.me.id === "u4dev" && bad.data.me.name === "Hacked", "A profile PATCH only ever edits the caller (Dev renamed himself, not Asha)");
  await dev.call("/api/profile", { method: "PATCH", body: { name: "Dev Varma" } });
  check((await asha.call("/api/state")).data.game.members.find((m) => m.id === "u1asha").name === "Asha Reddy", "Asha's name is untouched");

  // ---------- no free Aura ----------
  for (const t of ["box", "selfRate", "penalty", "lesson", "mood"]) {
    const r = await asha.act({ t, dim: "health", value: 10, id: "emerg", entry: { mood: 5, energy: 5 } });
    check(r.status === 400, `Removed action "${t}" is rejected (${r.status})`);
  }

  // ---------- Aura accuracy ----------
  const aura = (v, id) => v.game.logs.filter((l) => l.userId === id).reduce((a, l) => a + (l.xp > 0 ? l.xp : 0), 0);
  const a0 = aura((await asha.call("/api/state")).data, "u1asha");
  const r1 = await asha.act({ t: "habit", habitId: "h1read" });
  check(aura(r1.data, "u1asha") === a0 + 15, "Completing a 15-Aura habit adds exactly 15");
  const r2 = await asha.act({ t: "habit", habitId: "h1read" });
  check(aura(r2.data, "u1asha") === a0, "Tapping again undoes it exactly");
  await asha.act({ t: "habit", habitId: "h1read" });
  const act = { t: "activity", id: "e2eactv001", activityId: "read", minutes: 30, note: "Sapiens ch. 3" };
  await Promise.all([asha.act(act), asha.act(act)]);
  const v3 = (await asha.call("/api/state")).data;
  check(v3.game.logs.filter((l) => l.ref === "act:e2eactv001").length === 1, "The same activity sent twice at once is recorded once");
  check(aura(v3, "u1asha") === a0 + 15 + 20, "Totals add up after the duplicate attempt");

  // ---------- characters ----------
  const c1 = await asha.call("/api/profile", { method: "PATCH", body: { character: "volt" } });
  check(c1.status === 200 && c1.data.me.character === "volt", "Asha claims Volt");
  const c2 = await bala.call("/api/profile", { method: "PATCH", body: { character: "volt" } });
  check(c2.status === 409, `Bala can't take Asha's character (${c2.status}: ${c2.data.error})`);
  const f1 = await bala.call("/api/profile", { method: "PATCH", body: { frame: "gilded" } });
  check(f1.status === 403, `Locked frames are refused (${f1.status})`);
  const f2 = await asha.call("/api/profile", { method: "PATCH", body: { frame: "charged" } });
  check(f2.status === 200 && f2.data.me.frame === "charged", "Asha's 7-day-streak badge unlocks the Charged frame");
  const p1 = await bala.call("/api/profile", { method: "PATCH", body: { photo: "data:text/html;base64,PHNjcmlwdD4=" } });
  check(p1.status === 400, "Non-image 'photos' are refused");

  // ---------- notifications ----------
  const n0 = await dev.call("/api/notify");
  check(n0.status === 200 && n0.data.channels.whatsapp === false && n0.data.prefs.whatsapp === false, "WhatsApp is off by default and the server reports it isn't connected");
  const bp = await dev.call("/api/notify/phone", { method: "POST", body: { phone: "12345" } });
  check(bp.status === 400, "Invalid numbers are refused");
  const gp = await dev.call("/api/notify/phone", { method: "POST", body: { phone: "098765 43210" } });
  check(gp.status === 200 && gp.data.prefs.phone === "+919876543210" && gp.data.prefs.phoneVerified === false && gp.data.sent === false, "A number saves as +91, unverified, and no code is claimed to be sent");
  const opt = await dev.call("/api/notify", { method: "PATCH", body: { whatsapp: true } });
  check(opt.data.prefs.whatsapp === true && typeof opt.data.prefs.whatsappAt === "number", "Explicit opt-in is recorded with a timestamp");
  const test = await dev.call("/api/notify/test", { method: "POST", body: {} });
  const item = test.data.history && test.data.history[0];
  check(item && item.status === "simulated", `Without credentials a test is a labelled simulation (${item && item.status})`);
  check(!JSON.stringify((await asha.call("/api/state")).data).includes("9876543210"), "Dev's phone number never reaches Asha");
  const vf = await dev.call("/api/notify/verify", { method: "POST", body: { code: "123456" } });
  check(vf.status === 400, "There's nothing to verify without a real code");
  const un = await fetch(`${BASE}/api/notify/unsubscribe?u=u4dev&t=wrong`);
  check(un.ok && (await un.text()).includes("isn't valid"), "A wrong unsubscribe token changes nothing");
  const wh = await fetch(`${BASE}/api/whatsapp/webhook`, { method: "POST", body: "{}" });
  check(wh.status === 401, "Unsigned webhook calls are refused");
  const cr = await fetch(`${BASE}/api/cron`);
  check(cr.status === 503, "Cron stays off until CRON_SECRET is set");
  const xs = await fetch(`${BASE}/api/action`, { method: "POST", headers: { cookie: asha.cookie, origin: "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify({ action: { t: "habit", habitId: "h1run" } }) });
  check(xs.status === 403, "Cross-site writes are blocked");

  // ---------- engagement ----------
  const ev = (await bala.call("/api/state")).data.game.feed.find((e) => e.userId === "u1asha");
  const re = await bala.act({ t: "react", id: ev.id, kind: "fire" });
  check(re.data.game.feed.find((e) => e.id === ev.id).reactions.u2bala === "fire", "Bala reacts to Asha's update");
  const notifsA = (await asha.call("/api/state")).data.game.notifs;
  check(notifsA.some((n) => n.title === "Bala Krishna reacted to your update"), "Asha gets a personal notification about it");
  check(!(await dev.call("/api/state")).data.game.notifs.some((n) => n.title.includes("reacted")), "Dev doesn't see Asha's personal notification");

  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
