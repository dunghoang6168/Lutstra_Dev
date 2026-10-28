import { signal } from '@angular/core';

/**
 * Ids of the sites whose webview runs, shown on its page and hidden (still running) elsewhere. A site starts
 * on a visit to its page or from its switch in the Developer menu; every launch starts with none running.
 */
export const runningSites = signal<ReadonlySet<string>>(new Set());

export function setSiteRunning(id: string, running: boolean): void {
  if (runningSites().has(id) === running) return;
  const next = new Set(runningSites());
  if (running) next.add(id);
  else next.delete(id);
  runningSites.set(next);
}

/** Unread counts read from running sites' titles, by site id. */
export const unreadCounts = signal<ReadonlyMap<string, number>>(new Map());

export function setSiteUnread(id: string, count: number): void {
  if ((unreadCounts().get(id) ?? 0) === count) return;
  const next = new Map(unreadCounts());
  if (count > 0) next.set(id, count);
  else next.delete(id);
  unreadCounts.set(next);
}

// The switches were remembered until 2026-10-28; drop the old key.
try {
  localStorage.removeItem('lutsra.dev.webviews.running');
} catch {
  // Storage blocked: nothing was saved.
}
