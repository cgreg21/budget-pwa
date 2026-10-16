import { Injectable, signal } from '@angular/core';

const LOCK_KEY = 'budget-pwa:lock:v1';
const ITERATIONS = 150_000;
const MIN_PIN = 4;
const MAX_PIN = 8;
/** The app locks again once it stayed in the background this long. */
const AUTO_LOCK_MS = 30_000;
const FREE_ATTEMPTS = 5;
const BACKOFF_MS = 30_000;

interface LockRecord {
  salt: string;
  hash: string;
  iterations: number;
  /** Base64 id of the platform credential (fingerprint, face, device PIN) used to unlock, if enabled. */
  credentialId?: string;
}

interface Throttle {
  failures: number;
  until: number;
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toBase64(new Uint8Array(bits));
}

function readRecord(): LockRecord | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LOCK_KEY) ?? 'null');
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Partial<LockRecord>;
    if (typeof record.salt !== 'string' || typeof record.hash !== 'string' || typeof record.iterations !== 'number') return null;
    return { salt: record.salt, hash: record.hash, iterations: record.iterations, credentialId: typeof record.credentialId === 'string' ? record.credentialId : undefined };
  } catch {
    return null;
  }
}

/**
 * Opening lock of the app: a PIN, optionally replaced by the device's own unlock (WebAuthn platform
 * authenticator). It is a gate on the screen: the budget stays unencrypted in the browser storage.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  static readonly minPin = MIN_PIN;
  static readonly maxPin = MAX_PIN;

  private record = readRecord();
  private readonly enabledState = signal(this.record !== null);
  readonly enabled = this.enabledState.asReadonly();
  private readonly lockedState = signal(this.record !== null);
  readonly locked = this.lockedState.asReadonly();
  private readonly biometricState = signal(this.record?.credentialId !== undefined);
  readonly biometricEnabled = this.biometricState.asReadonly();
  readonly biometricAvailable = signal(false);
  /** Time until which a new attempt is refused (epoch ms), after too many wrong PINs. */
  readonly blockedUntil = signal(this.readThrottle().until);
  private hiddenAt: number | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.hiddenAt = Date.now();
      else {
        if (this.enabled() && this.hiddenAt !== null && Date.now() - this.hiddenAt >= AUTO_LOCK_MS) this.lockedState.set(true);
        this.hiddenAt = null;
      }
    });
    void this.detectBiometric();
  }

  static isValidPin(pin: string): boolean {
    return new RegExp(`^\\d{${MIN_PIN},${MAX_PIN}}$`).test(pin);
  }

  lock(): void {
    if (this.enabled()) this.lockedState.set(true);
  }

  async setPin(pin: string): Promise<void> {
    if (!LockService.isValidPin(pin)) throw new Error('Invalid PIN.');
    const salt = randomBytes(16);
    this.save({ salt: toBase64(salt), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS, credentialId: this.record?.credentialId });
    this.enabledState.set(true);
  }

  /** Checks a PIN; unlocks the app when it is right. Wrong attempts are slowed down after a few. */
  async unlock(pin: string): Promise<boolean> {
    const record = this.record;
    if (record === null) return true;
    if (Date.now() < this.blockedUntil()) return false;
    const hash = await derive(pin, fromBase64(record.salt), record.iterations);
    if (hash !== record.hash) {
      this.registerFailure();
      return false;
    }
    this.writeThrottle({ failures: 0, until: 0 });
    this.blockedUntil.set(0);
    this.lockedState.set(false);
    return true;
  }

  /** Whether the PIN is right, without unlocking (used before changing the settings). */
  async verify(pin: string): Promise<boolean> {
    const record = this.record;
    if (record === null) return false;
    return (await derive(pin, fromBase64(record.salt), record.iterations)) === record.hash;
  }

  disable(): void {
    this.record = null;
    localStorage.removeItem(LOCK_KEY);
    this.writeThrottle({ failures: 0, until: 0 });
    this.enabledState.set(false);
    this.biometricState.set(false);
    this.lockedState.set(false);
  }

  async enableBiometric(): Promise<boolean> {
    const record = this.record;
    if (record === null || !this.biometricAvailable()) return false;
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: 'Budget' },
          user: { id: randomBytes(16), name: 'budget', displayName: 'Budget' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
          timeout: 60_000,
        },
      });
      if (!(credential instanceof PublicKeyCredential)) return false;
      this.save({ ...record, credentialId: toBase64(new Uint8Array(credential.rawId)) });
      this.biometricState.set(true);
      return true;
    } catch {
      return false;
    }
  }

  disableBiometric(): void {
    const record = this.record;
    if (record === null) return;
    this.save({ salt: record.salt, hash: record.hash, iterations: record.iterations });
    this.biometricState.set(false);
  }

  async unlockWithBiometric(): Promise<boolean> {
    const id = this.record?.credentialId;
    if (id === undefined) return false;
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          allowCredentials: [{ type: 'public-key', id: fromBase64(id) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      });
      if (credential === null) return false;
      this.lockedState.set(false);
      return true;
    } catch {
      return false;
    }
  }

  private async detectBiometric(): Promise<void> {
    try {
      const available = typeof PublicKeyCredential !== 'undefined'
        && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      this.biometricAvailable.set(available);
    } catch {
      this.biometricAvailable.set(false);
    }
  }

  private save(record: LockRecord): void {
    this.record = record;
    localStorage.setItem(LOCK_KEY, JSON.stringify(record));
  }

  private registerFailure(): void {
    const failures = this.readThrottle().failures + 1;
    const until = failures >= FREE_ATTEMPTS ? Date.now() + BACKOFF_MS * 2 ** Math.min(failures - FREE_ATTEMPTS, 6) : 0;
    this.writeThrottle({ failures, until });
    this.blockedUntil.set(until);
  }

  private readThrottle(): Throttle {
    try {
      const value = JSON.parse(localStorage.getItem(`${LOCK_KEY}:throttle`) ?? 'null') as Partial<Throttle> | null;
      return { failures: Number(value?.failures) || 0, until: Number(value?.until) || 0 };
    } catch {
      return { failures: 0, until: 0 };
    }
  }

  private writeThrottle(throttle: Throttle): void {
    localStorage.setItem(`${LOCK_KEY}:throttle`, JSON.stringify(throttle));
  }
}
