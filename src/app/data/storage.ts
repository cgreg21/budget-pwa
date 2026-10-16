/** Suffix of the key where unreadable data is kept aside instead of being lost. */
const QUARANTINE_SUFFIX = ':corrupted';

/** The JSON stored under `key`, or `undefined` when absent or not JSON. */
function readStoredJson(key: string): { text: string; value: unknown } | undefined {
  const text = localStorage.getItem(key);
  if (text === null) return undefined;
  try {
    return { text, value: JSON.parse(text) };
  } catch {
    return { text, value: undefined };
  }
}

/**
 * The value under `key` when it passes `guard`, else `fallback()`. Unreadable content is dropped;
 * with `quarantine` it is moved to a sibling key so the user can still recover it by hand.
 */
export function readValidJson<T>(key: string, guard: (value: unknown) => value is T, fallback: () => T, quarantine = false): { value: T; corrupted: boolean } {
  const stored = readStoredJson(key);
  if (stored === undefined) return { value: fallback(), corrupted: false };
  if (guard(stored.value)) return { value: stored.value, corrupted: false };
  if (quarantine) localStorage.setItem(`${key}${QUARANTINE_SUFFIX}`, stored.text);
  localStorage.removeItem(key);
  return { value: fallback(), corrupted: true };
}
