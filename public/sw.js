/*
 * Thunderstorms 'n' All service worker.
 * - Never caches the app or its data: everything comes fresh from the server.
 * - If a page can't load because you're offline, shows a small offline page.
 * - Shows push notifications, confirms each one was shown (so the app can
 *   tell "sent" from "delivered"), and opens the right screen when tapped.
 */
const CACHE = "tna-shell-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const shown = self.registration.showNotification(data.title || "Thunderstorms 'n' All", {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  });
  // the receipt is best effort: if it fails (signed out, offline), the message simply stays "sent"
  const receipt = data.id
    ? shown.then(() => fetch("/api/notify/receipt", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.id }) }).catch(() => {}))
    : shown;
  event.waitUntil(receipt);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // only ever open pages of this app
  const target = url.origin === self.location.origin ? url.href : self.location.origin + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin !== self.location.origin) continue;
        try { await w.navigate(target); } catch { /* not controlled yet: focusing is enough */ }
        return w.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
