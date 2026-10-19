// Screenshots over the Chrome DevTools protocol. Usage: node --experimental-websocket shoot.js <user|-> <outdir> <w>x<h> <path> [path...]
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const BASE = "http://localhost:3100";
const [user, outDir, size, ...paths] = process.argv.slice(2);
const [W, H] = size.split("x").map(Number);
const mobile = W < 700;
const PORT = 9333 + Math.floor(Math.random() * 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  let cookie = null;
  if (user !== "-") {
    const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user, password: "testpass123" }) });
    cookie = (r.headers.get("set-cookie") || "").split(";")[0].split("=")[1];
  }
  const profile = path.join(__dirname, `chrome-${PORT}`);
  const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--force-color-profile=srgb", "about:blank",
  ], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let seq = 0;
  const waiting = new Map();
  const events = [];
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    else if (msg.method) events.push(msg);
  });
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  if (cookie) await send("Network.setCookie", { name: "tna_session", value: cookie, domain: "localhost", path: "/", httpOnly: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile });
  if (mobile) await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" });
  for (const p of paths) {
    events.length = 0;
    await send("Page.navigate", { url: BASE + p });
    for (let i = 0; i < 60 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100);
    await sleep(2200);
    const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error"));
    for (const e of errs) console.log(`  console error on ${p}:`, JSON.stringify(e.params.exceptionDetails?.exception?.description ?? e.params.args?.map((a) => a.value ?? a.description)).slice(0, 300));
    const { result } = await send("Runtime.evaluate", { expression: "Math.min(document.documentElement.scrollHeight, 4200)", returnByValue: true });
    const height = Math.max(H, result.result.value);
    await send("Emulation.setDeviceMetricsOverride", { width: W, height, deviceScaleFactor: 1, mobile });
    await sleep(400);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile });
    const file = path.join(outDir, `${(p.replace(/[/?=&]+/g, "_").replace(/^_|_$/g, "") || "home")}-${W}.png`);
    fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    console.log(`${file} (${height}px)`);
  }
  ws.close();
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold files */ }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
