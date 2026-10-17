/**
 * The first version of the app kept a demo game (sample cousins, their
 * quests and activity) in this browser's localStorage. On first run of the
 * new app that data is backed up under a separate key and the demo copy is
 * removed, so it can never resurface as anyone's profile. The backup can be
 * downloaded from Settings.
 */
const LEGACY_KEYS = ["thunderstorms-n-all:v1"];
const BACKUP_KEY = "thunderstorms-n-all:legacy-backup";

export function migrateLegacyBrowserData() {
  try {
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), key, data: raw }));
      localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable: nothing to migrate */
  }
}

export function legacyBackup(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}
