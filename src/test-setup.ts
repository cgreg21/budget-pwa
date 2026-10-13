// Runs before every spec file: a real-enough IndexedDB for `secrets.ts` and a predictable localStorage.
import 'fake-indexeddb/auto';

/**
 * Node ships its own (empty) `localStorage` global that vitest's jsdom environment does not replace,
 * so the Web Storage API is provided here, in memory, with the same semantics the app relies on.
 */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  getItem(key: string): string | null { return this.map.get(String(key)) ?? null; }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string): void { this.map.delete(String(key)); }
  setItem(key: string, value: string): void { this.map.set(String(key), String(value)); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });

beforeEach(() => {
  localStorage.clear();
});
