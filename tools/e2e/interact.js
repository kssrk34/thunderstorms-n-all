// Scripted interactions over CDP. Usage: node --experimental-websocket interact.js <user> <outdir> <w>x<h> <script.json>
// Steps: {go}, {click: "text"|{sel}}, {files: {sel, path}}, {wait: ms}, {shot: name}, {eval: "js"}
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const BASE = "http://localhost:3100";
const [user, outDir, size, scriptFile] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(scriptFile, "utf8"));
const [W, H] = size.split("x").map(Number);
const PORT = 9900 + Math.floor(Math.random() * 90);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user, password: "testpass123" }) });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0].split("=")[1];
  const profile = path.join(__dirname, `chrome-${PORT}`);
  const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* starting */ } }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res) => ws.addEventListener("open", res));
  let seq = 0; const waiting = new Map(); const events = [];
  ws.addEventListener("message", (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); } else if (msg.method) events.push(msg); });
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; waiting.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Page.enable"); await send("Runtime.enable"); await send("DOM.enable");
  await send("Network.setCookie", { name: "tna_session", value: cookie, domain: "localhost", path: "/", httpOnly: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  const PRESS = "window.__press = (el) => { const o = { bubbles: true, cancelable: true, button: 0 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new MouseEvent('mousedown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); el.dispatchEvent(new MouseEvent('mouseup', o)); el.click(); };";
  await send("Page.addScriptToEvaluateOnNewDocument", { source: PRESS });
  for (const s of steps) {
    if (s.go) { events.length = 0; await send("Page.navigate", { url: BASE + s.go }); for (let i = 0; i < 60 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100); await sleep(1800); }
    if (s.click) {
      const ok = await evaluate(typeof s.click === "string"
        ? `(() => { const t = ${JSON.stringify(s.click)}; const els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => e.offsetParent !== null); const el = els.find((e) => e.textContent.trim() === t) || els.find((e) => (e.getAttribute('aria-label') || '') === t) || els.find((e) => e.textContent.trim().startsWith(t)); if (!el) return false; window.__press(el); return true; })()`
        : `(() => { const el = document.querySelector(${JSON.stringify(s.click.sel)}); if (!el) return false; window.__press(el); return true; })()`);
      console.log(`click ${JSON.stringify(s.click)}: ${ok ? "ok" : "NOT FOUND"}`);
      await sleep(s.after ?? 700);
    }
    if (s.files) {
      const { root } = await send("DOM.getDocument").then((x) => x.result);
      const { nodeId } = (await send("DOM.querySelector", { nodeId: root.nodeId, selector: s.files.sel })).result;
      await send("DOM.setFileInputFiles", { nodeId, files: [s.files.path] });
      console.log(`files -> ${s.files.sel}`);
      await sleep(1500);
    }
    if (s.type) { await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(s.type.sel)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(s.type.text)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(300); }
    if (s.wait) await sleep(s.wait);
    if (s.eval) console.log(`eval: ${JSON.stringify(await evaluate(s.eval))}`);
    if (s.shot) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const file = path.join(outDir, `${s.shot}.png`);
      fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
      console.log(`shot ${file}`);
    }
  }
  for (const e of events.filter((e) => e.method === "Runtime.exceptionThrown")) console.log("EXCEPTION", e.params.exceptionDetails?.exception?.description?.slice(0, 300));
  ws.close(); chrome.kill(); await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* still locked */ }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
