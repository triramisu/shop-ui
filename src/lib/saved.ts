import { useSyncExternalStore } from 'react';

const key = 'shop.saved.v1';
const listeners = new Set<() => void>();
let ids: string[] = read();

function read(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((id): id is string => typeof id === 'string'),
          ),
        ].slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === key || event.key === null) {
    ids = read();
    listeners.forEach((notify) => notify());
  }
});

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}
const snapshot = () => ids;

export function useSaved() {
  const saved = useSyncExternalStore(subscribe, snapshot);
  function toggle(id: string) {
    ids = ids.includes(id)
      ? ids.filter((item) => item !== id)
      : [...ids, id].slice(-100);
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* Session-only when storage is unavailable. */
    }
    listeners.forEach((notify) => notify());
  }
  return { saved, toggle };
}
