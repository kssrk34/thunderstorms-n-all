export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** JSON fetch for our own API. Never throws; network trouble comes back as status 0. */
export async function api<T>(url: string, init: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: (data as { error?: string }).error ?? "Something went wrong. Please try again." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "You seem to be offline. Check your connection and try again." };
  }
}
