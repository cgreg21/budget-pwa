import { IDBFactory } from 'fake-indexeddb';

type Secrets = typeof import('./secrets');

/** Reads the raw record stored under `id` in the secrets database. */
function rawRecord(id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('budget-pwa-secrets', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('secrets', 'readonly').objectStore('secrets').get(id);
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    };
  });
}

describe('secrets', () => {
  let secrets: Secrets;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Module state (the cached key) and the database both start fresh for every test.
    vi.resetModules();
    vi.stubGlobal('indexedDB', new IDBFactory());
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    secrets = await import('./secrets');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is available with IndexedDB and WebCrypto', () => {
    expect(secrets.isSecretStorageAvailable()).toBe(true);
    expect(secrets.CALENDAR_PASSWORD_SECRET).toBe('calendar-password');
  });

  it('reads an empty string when nothing is saved', async () => {
    expect(await secrets.readSecret('calendar-password')).toBe('');
    expect(warn).not.toHaveBeenCalled();
  });

  it('round-trips a secret, encrypted at rest', async () => {
    expect(await secrets.writeSecret('calendar-password', 'hunter2')).toBe(true);
    expect(await secrets.readSecret('calendar-password')).toBe('hunter2');
    const raw = await rawRecord('calendar-password') as { iv: ArrayBuffer; data: ArrayBuffer };
    expect(raw.iv.byteLength).toBe(12);
    expect(new TextDecoder().decode(raw.data)).not.toContain('hunter2');
    expect(await rawRecord('aes-key')).toBeInstanceOf(CryptoKey);
  });

  it('reuses the device key saved by a previous session', async () => {
    await secrets.writeSecret('calendar-password', 'first');
    vi.resetModules();
    const fresh: Secrets = await import('./secrets');
    expect(await fresh.readSecret('calendar-password')).toBe('first');
  });

  it('forgets a secret with an empty value', async () => {
    await secrets.writeSecret('calendar-password', 'hunter2');
    expect(await secrets.writeSecret('calendar-password', '')).toBe(true);
    expect(await secrets.readSecret('calendar-password')).toBe('');
    expect(await rawRecord('calendar-password')).toBeUndefined();
  });

  it('serialises writes so the last one wins', async () => {
    const results = await Promise.all([
      secrets.writeSecret('calendar-password', 'old'),
      secrets.writeSecret('calendar-password', ''),
      secrets.writeSecret('calendar-password', 'new'),
    ]);
    expect(results).toEqual([true, true, true]);
    expect(await secrets.readSecret('calendar-password')).toBe('new');
    await Promise.all([secrets.writeSecret('calendar-password', 'x'), secrets.writeSecret('calendar-password', '')]);
    expect(await secrets.readSecret('calendar-password')).toBe('');
  });

  describe('without secret storage', () => {
    it('reports WebCrypto missing', async () => {
      vi.stubGlobal('crypto', {});
      expect(secrets.isSecretStorageAvailable()).toBe(false);
      expect(await secrets.readSecret('calendar-password')).toBe('');
      expect(await secrets.writeSecret('calendar-password', 'x')).toBe(false);
    });

    it('reports IndexedDB missing', () => {
      vi.stubGlobal('indexedDB', undefined);
      expect(secrets.isSecretStorageAvailable()).toBe(false);
    });
  });

  describe('failures', () => {
    it('degrades to false when the key cannot be created, then recovers', async () => {
      const generate = vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValueOnce(new Error('no key'));
      expect(await secrets.writeSecret('calendar-password', 'x')).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be saved'), expect.any(Error));
      expect(await secrets.writeSecret('calendar-password', 'x')).toBe(true);
      expect(generate).toHaveBeenCalledTimes(2);
    });

    it('reads an empty string when decryption fails', async () => {
      await secrets.writeSecret('calendar-password', 'x');
      vi.spyOn(crypto.subtle, 'decrypt').mockRejectedValueOnce(new DOMException('bad', 'OperationError'));
      expect(await secrets.readSecret('calendar-password')).toBe('');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'), expect.anything());
    });

    it('treats a database that cannot be opened as empty', async () => {
      const failing = (reason: 'error' | 'blocked', error: DOMException | null) => (): IDBOpenDBRequest => {
        const request = { error } as unknown as IDBOpenDBRequest & { onerror(): void; onblocked(): void };
        setTimeout(() => (reason === 'error' ? request.onerror() : request.onblocked()), 0);
        return request;
      };
      vi.spyOn(indexedDB, 'open').mockImplementation(failing('error', new DOMException('denied', 'SecurityError')));
      expect(await secrets.readSecret('calendar-password')).toBe('');
      expect(warn).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ name: 'SecurityError' }));
      vi.spyOn(indexedDB, 'open').mockImplementation(failing('error', null));
      expect(await secrets.writeSecret('calendar-password', 'x')).toBe(false);
      expect(warn).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ message: 'IndexedDB unavailable' }));
      vi.spyOn(indexedDB, 'open').mockImplementation(failing('blocked', null));
      expect(await secrets.writeSecret('calendar-password', '')).toBe(false);
      expect(warn).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ message: 'IndexedDB blocked' }));
    });
  });
});
