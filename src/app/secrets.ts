/**
 * Secrets kept on the device across sessions.
 *
 * A browser has no system keyring, so secrets are encrypted with AES-GCM under a key that is
 * generated once, marked non-extractable and stored as a CryptoKey object in IndexedDB. The key
 * material never leaves the browser's crypto engine; the ciphertext lives next to it. Anything that
 * goes wrong (private mode, storage cleared, unsupported browser) degrades to "no secret saved" —
 * the caller then asks the user again rather than failing.
 */

import { activeSecretName } from './profiles';

const DB_NAME = 'budget-pwa-secrets';
const DB_VERSION = 1;
const STORE = 'secrets';
const KEY_ID = 'aes-key';
const IV_BYTES = 12;

export const CALENDAR_PASSWORD_BASE_NAME = 'calendar-password';
export const CALENDAR_PASSWORD_SECRET = activeSecretName(CALENDAR_PASSWORD_BASE_NAME);

interface StoredSecret { iv: ArrayBuffer; data: ArrayBuffer }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

function requestOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function read<T>(id: string): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await requestOf(db.transaction(STORE, 'readonly').objectStore(STORE).get(id) as IDBRequest<T | undefined>);
  } finally {
    db.close();
  }
}

async function write(id: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(value, id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write aborted'));
    });
  } finally {
    db.close();
  }
}

async function remove(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'));
    });
  } finally {
    db.close();
  }
}

let keyPromise: Promise<CryptoKey> | undefined;
/** Writes are serialized so that a "forget" followed by a "save" ends with the saved value. */
let writeQueue: Promise<unknown> = Promise.resolve();

/** The device key, created on first use. Non-extractable: it can encrypt and decrypt but never be exported. */
function deviceKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const existing = await read<CryptoKey>(KEY_ID);
    if (existing instanceof CryptoKey) return existing;
    const created = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await write(KEY_ID, created);
    return created;
  })().catch((error: unknown) => {
    keyPromise = undefined;
    throw error;
  });
  return keyPromise;
}

/** Whether this browser can keep secrets across sessions at all. */
export function isSecretStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && crypto.subtle !== undefined;
}

/** The saved secret, or '' when none is saved or it cannot be read. */
export async function readSecret(name: string): Promise<string> {
  if (!isSecretStorageAvailable()) return '';
  try {
    const stored = await read<StoredSecret>(name);
    if (stored === undefined) return '';
    const key = await deviceKey();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(stored.iv) }, key, stored.data);
    return new TextDecoder().decode(plain);
  } catch (error) {
    console.warn(`The secret "${name}" could not be read:`, error);
    return '';
  }
}

/** Saves the secret for later sessions; an empty value forgets it. Returns `false` when it could not be kept. */
export function writeSecret(name: string, value: string): Promise<boolean> {
  if (!isSecretStorageAvailable()) return Promise.resolve(false);
  const next = writeQueue.then(() => writeNow(name, value));
  writeQueue = next.catch(() => undefined);
  return next;
}

async function writeNow(name: string, value: string): Promise<boolean> {
  try {
    if (value === '') {
      await remove(name);
      return true;
    }
    const key = await deviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
    await write(name, { iv: iv.buffer, data } satisfies StoredSecret);
    return true;
  } catch (error) {
    console.warn(`The secret "${name}" could not be saved:`, error);
    return false;
  }
}
