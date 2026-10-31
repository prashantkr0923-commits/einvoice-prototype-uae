// The prototype's "database": a small store persisted in the browser's
// localStorage. In production this is Volopay's own database.
import { useSyncExternalStore } from 'react';
import { DB_VERSION, seedDB } from './seed';
import type { DB } from './types';

const KEY = 'einvoice-prototype-uae/db';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === DB_VERSION && Array.isArray(parsed.invoices)) return parsed;
    }
  } catch {
    // Storage unavailable (private mode, blocked): fall back to in-memory data.
  }
  return seedDB();
}

let db: DB = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Ignore: the demo still works in memory.
  }
}

export function getDB(): DB {
  return db;
}

/** Replace the database with a new immutable copy and notify the screens. */
export function commit(next: DB) {
  db = next;
  persist();
  listeners.forEach((l) => l());
}

export function resetDB() {
  commit(seedDB());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, getDB);
}

export const uid = () => Math.random().toString(36).slice(2, 10);
