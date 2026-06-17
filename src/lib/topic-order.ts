// Per-viewer custom ordering for topics and sub-topics.
// The order is a personal preference stored in localStorage — it is NOT
// persisted to the database and is not shared with other users. A single
// shared key drives both the topic config page and the left-nav sidebar.

import { useSyncExternalStore } from "react";

export interface TopicOrderState {
  /** Ordered topic ids. */
  topics: string[];
  /** Ordered sub-topic ids, keyed by their parent topic id. */
  subs: Record<string, string[]>;
}

const KEY_PREFIX = "interview-prep:topic-order";
const CHANGE_EVENT = "interview-prep:topic-order-change";

/** The single key used everywhere topics are shown (config page + sidebar). */
export const TOPIC_ORDER_KEY = "topics";

const EMPTY: TopicOrderState = { topics: [], subs: {} };

function storageKey(key: string) {
  return `${KEY_PREFIX}:${key}`;
}

function parse(raw: string | null): TopicOrderState {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<TopicOrderState>;
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      subs: parsed.subs && typeof parsed.subs === "object" ? parsed.subs : {},
    };
  } catch {
    return EMPTY;
  }
}

export function loadOrder(key: string): TopicOrderState {
  if (typeof window === "undefined") return EMPTY;
  return parse(window.localStorage.getItem(storageKey(key)));
}

export function saveOrder(key: string, state: TopicOrderState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(state));
    // Notify subscribers in the current tab (the native `storage` event only
    // fires in *other* tabs), so the sidebar reflects reorders immediately.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    // Ignore quota / serialization errors — ordering is a best-effort preference.
  }
}

/**
 * Returns `items` reordered to match the saved `order` of ids. Items missing
 * from `order` (e.g. newly created ones) keep their incoming relative position
 * and are appended after the explicitly ordered items. `Array.prototype.sort`
 * is stable, so the server-provided order is preserved for ties.
 */
export function applyOrder<T extends { id: string }>(
  items: T[],
  order: string[]
): T[] {
  if (!order.length) return items;
  const index = new Map(order.map((id, i) => [id, i] as const));
  return [...items].sort((a, b) => {
    const ai = index.get(a.id) ?? Infinity;
    const bi = index.get(b.id) ?? Infinity;
    return ai - bi;
  });
}

// --- Reactive hook -------------------------------------------------------
// `useSyncExternalStore` keeps every consumer (config page, sidebar) in sync
// with localStorage and with each other, across reorders and across tabs.

// Cache parsed snapshots per key so getSnapshot returns a stable reference
// when the underlying string is unchanged (required by useSyncExternalStore).
const snapshotCache = new Map<string, { raw: string | null; value: TopicOrderState }>();

function getSnapshot(key: string): TopicOrderState {
  const raw =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(storageKey(key));
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value;
  const value = parse(raw);
  snapshotCache.set(key, { raw, value });
  return value;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTopicOrder(key: string = TOPIC_ORDER_KEY): TopicOrderState {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(key),
    () => EMPTY
  );
}
