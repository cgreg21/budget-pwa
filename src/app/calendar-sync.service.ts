import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { merge } from 'rxjs';
import {
  CATEGORIES_BASELINE_KEY, CalDavClient, CalendarError, DEFAULT_CALENDAR_CONFIG, DISABLED_CALENDAR_STATUS,
  isCalendarConfig, isCalendarConfigComplete, normalizeCalendarConfig, syncCalendar,
  type CalendarConfig, type CalendarStatus, type HttpRequest, type HttpTransport, type SyncBaseline,
} from 'budget-lib';

import { BudgetService } from './budget.service';
import { CALENDAR_PASSWORD_SECRET, isSecretStorageAvailable, readSecret, writeSecret } from './secrets';
import { SettingsService } from './settings.service';
import { SnackbarService } from './snackbar.service';
import { readValidJson } from './storage';

const CONFIG_KEY = 'budget-pwa:calendar:v1';
const BASELINE_KEY = 'budget-pwa:calendar-baseline:v1';
const PROXY_KEY = 'budget-pwa:calendar-proxy:v1';

/** A proxy address reduced to what the transport needs: `https://host[/prefix]`, no trailing slash. */
export function normalizeProxyUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * Sends the request through a CORS proxy (see budget-caldav-proxy): the server origin travels in an
 * `X-Upstream` header while the path is kept, so hrefs returned by the server still resolve correctly.
 */
export function proxied(request: HttpRequest, proxyUrl: string): HttpRequest {
  if (proxyUrl === '') return request;
  const target = new URL(request.url);
  return {
    ...request,
    url: proxyUrl + target.pathname + target.search,
    headers: { ...request.headers, 'X-Upstream': target.origin },
  };
}

/** HTTP error codes are responses; only fetch/network failures reject. */
export const calendarTransport: HttpTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method, headers: request.headers, body: request.body,
    credentials: 'omit', signal: AbortSignal.timeout(30_000),
  });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => { headers[name.toLowerCase()] = value; });
  return { status: response.status, headers, body: await response.text() };
};

function readProxyUrl(): string {
  return normalizeProxyUrl(localStorage.getItem(PROXY_KEY) ?? '');
}

/** The saved calendar settings; unreadable ones fall back to "disabled" rather than blocking the app. */
function readConfig(): CalendarConfig {
  return normalizeCalendarConfig(readValidJson(CONFIG_KEY, isCalendarConfig, () => ({ ...DEFAULT_CALENDAR_CONFIG })).value);
}

interface SavedBaseline { baseline: SyncBaseline; lastSync?: string }

function isBaseline(value: unknown): value is SyncBaseline {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every((entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) return false;
      return 'href' in entry && typeof entry.href === 'string'
        && 'hash' in entry && typeof entry.hash === 'string'
        && (!('etag' in entry) || entry.etag === undefined || typeof entry.etag === 'string');
    });
}

function isSavedBaseline(value: unknown): value is SavedBaseline {
  return typeof value === 'object' && value !== null && 'baseline' in value && isBaseline(value.baseline)
    && (!('lastSync' in value) || value.lastSync === undefined
      || (typeof value.lastSync === 'string' && Number.isFinite(Date.parse(value.lastSync))));
}

/** The last known server state; an unreadable one is dropped, the next sync starts from scratch. */
function readBaseline(): SavedBaseline {
  return readValidJson(BASELINE_KEY, isSavedBaseline, () => ({ baseline: {} })).value;
}

@Injectable({ providedIn: 'root' })
export class CalendarSyncService implements OnDestroy {
  private readonly configState = signal(readConfig());
  readonly config = this.configState.asReadonly();
  private readonly proxyState = signal(readProxyUrl());
  /** Address of the CORS proxy requests go through; empty means direct access. PWA-only setting. */
  readonly proxyUrl = this.proxyState.asReadonly();
  private readonly transport: HttpTransport = (request) => calendarTransport(proxied(request, this.proxyState()));
  readonly active = computed(() => this.config().enabled);
  readonly busy = signal(false);
  private saved = readBaseline();
  private readonly statusState = signal<CalendarStatus>({
    state: this.config().enabled ? 'offline' : 'disabled', lastSync: this.saved.lastSync,
  });
  readonly status = this.statusState.asReadonly();
  private password = '';
  /** Resolves once the saved password has been looked up; sync waits for it so it does not report a missing password too early. */
  private readonly passwordLoaded: Promise<void>;
  private readonly passwordPersistentState = signal(isSecretStorageAvailable());
  /** Whether the password survives a reload (encrypted on this device) rather than this session only. */
  readonly passwordPersistent = this.passwordPersistentState.asReadonly();
  private readonly hasPasswordState = signal(false);
  readonly hasPassword = this.hasPasswordState.asReadonly();
  private generation = 0;
  private scheduled: ReturnType<typeof setTimeout> | undefined;
  private periodic: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;
  private syncRequested = false;
  private checkRequested = false;
  /** Set by a user-triggered run, which reports its success; failures are reported whenever the state changes. */
  private notifyRequested = false;
  private destroyed = false;
  private readonly resumed = (): void => { void this.syncNow(); };
  private readonly visible = (): void => {
    if (document.visibilityState === 'visible') this.resumed();
  };
  private readonly subscription;

  constructor(private readonly budget: BudgetService, private readonly settings: SettingsService, private readonly snackbar: SnackbarService) {
    this.subscription = merge(budget.transactionChanges, budget.categoryChanges).subscribe(() => this.schedule());
    window.addEventListener('online', this.resumed);
    document.addEventListener('visibilitychange', this.visible);
    this.passwordLoaded = readSecret(CALENDAR_PASSWORD_SECRET).then((password) => {
      if (this.destroyed || this.password !== '') return;
      this.password = password;
      this.hasPasswordState.set(password !== '');
    });
    queueMicrotask(() => { if (!this.destroyed && this.active()) void this.syncNow(); });
    this.restartPeriodic();
  }

  /** Automatic synchronisation every `syncIntervalMinutes`; off when the calendar is disabled or the interval is 0. */
  private restartPeriodic(): void {
    if (this.periodic !== undefined) clearInterval(this.periodic);
    this.periodic = undefined;
    const minutes = this.config().syncIntervalMinutes ?? 0;
    if (this.destroyed || !this.active() || minutes <= 0) return;
    this.periodic = setInterval(() => { void this.syncNow(); }, minutes * 60_000);
  }

  configure(config: CalendarConfig, password: string | null, proxyUrl?: string): boolean {
    const next = normalizeCalendarConfig(config);
    if (config.enabled && !isCalendarConfigComplete(next)) {
      this.statusState.update((status) => ({ ...status, state: 'error', message: this.settings.t().calendar.invalidConfig }));
      return false;
    }
    const nextProxy = proxyUrl === undefined ? this.proxyState() : normalizeProxyUrl(proxyUrl);
    const previous = this.config();
    const changed = previous.calendarUrl !== next.calendarUrl || previous.username !== next.username;
    const restart = changed || previous.enabled !== next.enabled || nextProxy !== this.proxyState()
      || (password !== null && password !== this.password);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    if (nextProxy === '') localStorage.removeItem(PROXY_KEY);
    else localStorage.setItem(PROXY_KEY, nextProxy);
    this.proxyState.set(nextProxy);
    if (changed) {
      localStorage.removeItem(BASELINE_KEY);
      this.saved = { baseline: {} };
      this.setPassword('');
    }
    if (password !== null) this.setPassword(password);
    if (restart) {
      this.generation += 1;
      this.cancelScheduled();
      this.syncRequested = false;
      this.checkRequested = false;
    }
    this.configState.set(next);
    this.statusState.set(next.enabled
      ? { state: 'offline', lastSync: this.saved.lastSync }
      : { ...DISABLED_CALENDAR_STATUS, lastSync: this.saved.lastSync });
    this.restartPeriodic();
    return true;
  }

  /** The password in use, once the saved one has been looked up; '' when none is known. */
  async readPassword(): Promise<string> {
    await this.passwordLoaded;
    return this.password;
  }

  /** Keeps the password for this session and, when the device can, encrypted for later ones. */
  private setPassword(password: string): void {
    this.password = password;
    this.hasPasswordState.set(password !== '');
    void writeSecret(CALENDAR_PASSWORD_SECRET, password).then((persisted) => {
      if (!this.destroyed && password !== '') this.passwordPersistentState.set(persisted);
    });
  }

  syncNow(notify = false): Promise<void> {
    if (this.destroyed || !this.active()) return Promise.resolve();
    this.cancelScheduled();
    this.syncRequested = true;
    if (notify) this.notifyRequested = true;
    return this.start();
  }

  checkConnection(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    this.checkRequested = true;
    this.notifyRequested = true;
    return this.start();
  }

  private schedule(): void {
    if (!this.active() || this.destroyed) return;
    if (this.running) {
      this.syncRequested = true;
      return;
    }
    this.cancelScheduled();
    this.scheduled = setTimeout(() => {
      this.scheduled = undefined;
      void this.syncNow();
    }, 2000);
  }

  private cancelScheduled(): void {
    if (this.scheduled !== undefined) clearTimeout(this.scheduled);
    this.scheduled = undefined;
  }

  private start(): Promise<void> {
    if (this.running) return this.running;
    this.busy.set(true);
    // Defer draining until running is assigned, even when credentials are missing.
    this.running = Promise.resolve().then(() => this.drain()).finally(() => {
      this.running = undefined;
      this.busy.set(false);
      if (!this.destroyed && (this.syncRequested || this.checkRequested)) void this.start();
    });
    return this.running;
  }

  private async drain(): Promise<void> {
    await this.passwordLoaded;
    while (!this.destroyed && (this.syncRequested || this.checkRequested)) {
      const check = this.checkRequested;
      if (check) this.checkRequested = false;
      else this.syncRequested = false;
      const config = this.config();
      if (!check && !config.enabled) continue;
      const strings = this.settings.t().calendar;
      if (!isCalendarConfigComplete(config) || this.password === '') {
        this.syncRequested = false;
        this.checkRequested = false;
        this.statusState.update((status) => ({
          ...status, state: 'error', message: !isCalendarConfigComplete(config) ? strings.invalidConfig : strings.passwordRequired,
        }));
        continue;
      }
      const generation = this.generation;
      const notify = this.notifyRequested;
      this.notifyRequested = false;
      const previousState = this.statusState().state;
      const client = new CalDavClient(config, this.password, this.transport);
      this.statusState.update((status) => ({ ...status, state: 'syncing', message: undefined }));
      try {
        if (check) {
          await client.check();
          if (generation === this.generation) {
            const message = config.enabled ? strings.connected : strings.connectedDisabled;
            this.statusState.set({ state: config.enabled ? 'online' : 'disabled', lastSync: this.saved.lastSync, message });
            this.snackbar.show(message);
          }
        } else {
          const snapshot = this.budget.allTransactions().map((item) => ({ ...item }));
          const categories = this.budget.categories();
          const trash = this.budget.trash().map((item) => ({ ...item }));
          const outcome = await syncCalendar(client, snapshot, this.saved.baseline, categories, this.budget.recurrences(), trash);
          if (generation !== this.generation || this.destroyed) continue;
          const baseline = { ...outcome.baseline };
          let nextCategories = outcome.categories;
          if (nextCategories !== null && this.budget.categories() !== categories) {
            // A local edit made meanwhile must not be overwritten; forgetting the category baseline makes the next run merge.
            nextCategories = null;
            delete baseline[CATEGORIES_BASELINE_KEY];
          }
          this.budget.applyCalendarChanges(outcome.upsertLocal, outcome.removeLocal, snapshot, nextCategories);
          this.budget.applyCalendarTrash(outcome.trashAdded, outcome.trashRemoved);
          const saved = { baseline, lastSync: new Date().toISOString() };
          localStorage.setItem(BASELINE_KEY, JSON.stringify(saved));
          this.saved = saved;
          this.statusState.set({
            state: 'online', lastSync: saved.lastSync,
            message: outcome.skipped > 0 ? strings.conflicts(outcome.skipped) : undefined,
          });
          if (notify) {
            if (outcome.skipped > 0) this.snackbar.show(strings.conflicts(outcome.skipped), { kind: 'info' });
            else this.snackbar.show(this.settings.t().snackbar.synced);
          }
        }
      } catch (error: unknown) {
        if (generation !== this.generation || this.destroyed) continue;
        const offline = error instanceof TypeError
          || (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError'));
        const message = error instanceof CalendarError
          ? (error.kind === 'auth' ? strings.authError : strings.serverError(error.message))
          : offline ? strings.networkError : strings.serverError(error instanceof Error ? error.message : String(error));
        this.statusState.set({ state: offline ? 'offline' : 'error', lastSync: this.saved.lastSync, message });
        if (notify || previousState !== (offline ? 'offline' : 'error')) this.snackbar.error(message);
        // A change received during this run gets one more attempt; otherwise wait for a new trigger.
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation += 1;
    this.password = '';
    this.cancelScheduled();
    if (this.periodic !== undefined) clearInterval(this.periodic);
    this.subscription.unsubscribe();
    window.removeEventListener('online', this.resumed);
    document.removeEventListener('visibilitychange', this.visible);
  }
}
