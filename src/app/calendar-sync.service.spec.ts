import { TestBed } from '@angular/core/testing';
import { DEFAULT_CATEGORIES, base64Utf8, categoriesToIcs, transactionToIcs, type Category, type Transaction } from 'budget-lib';

import { BudgetService } from './budget.service';
import { CalendarSyncService, calendarTransport, normalizeProxyUrl, proxied } from './calendar-sync.service';
import { CALENDAR_PASSWORD_SECRET, readSecret, writeSecret } from './secrets';
import { SettingsService } from './settings.service';

const CONFIG_KEY = 'budget-pwa:calendar:v1';
const BASELINE_KEY = 'budget-pwa:calendar-baseline:v1';
const PROXY_KEY = 'budget-pwa:calendar-proxy:v1';
const DATA_KEY = 'budget-pwa:data:v1';

const CONFIG = { enabled: true, calendarUrl: 'https://dav.test/cal/', username: 'alice' };
const PROPFIND_BODY = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:href>/cal/</d:href><d:propstat><d:prop>'
  + '<d:resourcetype><d:collection/><c:calendar xmlns:c="urn:ietf:params:xml:ns:caldav"/></d:resourcetype></d:prop>'
  + '<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>';
const EMPTY_LIST = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"></d:multistatus>';
const listOf = (...events: { href: string; etag: string; transaction?: Transaction; categories?: readonly Category[] }[]): string =>
  '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">'
  + events.map(({ href, etag, transaction, categories }) => `<d:response><d:href>${href}</d:href><d:propstat><d:prop><d:getetag>"${etag}"</d:getetag>`
    + `<c:calendar-data><![CDATA[${categories ? categoriesToIcs(categories) : transactionToIcs(transaction as Transaction)}]]></c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`).join('')
  + '</d:multistatus>';

const CATEGORIES_HREF = '/cal/categories.ics';
/** A calendar holding the given category list (the default one unless told otherwise) and the given transactions. */
const calendarWith = (categories: readonly Category[] = DEFAULT_CATEGORIES, ...events: { href: string; etag: string; transaction: Transaction }[]): string =>
  listOf({ href: CATEGORIES_HREF, etag: 'c1', categories }, ...events);

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

interface Call { method: string; url: string; headers: Record<string, string>; body?: string }
type Handler = (call: Call) => Response | Promise<Response>;

const respond = (status: number, body = '', headers: Record<string, string> = {}): Response => new Response(body, { status, headers });

/** A fake CalDAV server answering by method, recording what it was asked. */
function server(handlers: Partial<Record<string, Handler>> = {}): { calls: Call[]; fetch: ReturnType<typeof vi.fn> } {
  const calls: Call[] = [];
  const defaults: Record<string, Handler> = {
    PROPFIND: () => respond(207, PROPFIND_BODY),
    REPORT: () => respond(207, calendarWith()),
    PUT: () => respond(201, '', { ETag: '"e1"' }),
    DELETE: () => respond(204),
  };
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const call: Call = { method: init.method ?? 'GET', url, headers: init.headers as Record<string, string>, body: init.body as string | undefined };
    calls.push(call);
    const handler = handlers[call.method] ?? defaults[call.method];
    if (!handler) throw new Error(`unexpected ${call.method}`);
    return handler(call);
  });
  vi.stubGlobal('fetch', fetch);
  return { calls, fetch };
}

/** Lets pending promises, IndexedDB tasks and microtasks run (fake-indexeddb schedules on setImmediate, which is left real). */
const nextTask = (globalThis as unknown as { setImmediate(fn: () => void): void }).setImmediate;
async function settle(rounds = 25): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await new Promise<void>((resolve) => nextTask(resolve));
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('normalizeProxyUrl', () => {
  it.each([
    ['', ''], ['   ', ''], ['https://proxy.example/', 'https://proxy.example'],
    [' https://proxy.example/prefix// ', 'https://proxy.example/prefix'],
    ['http://localhost:8080/a/b', 'http://localhost:8080/a/b'],
    ['https://proxy.example/?q=1#x', 'https://proxy.example'],
    ['ftp://proxy.example', ''], ['not a url', ''], ['//host', ''],
  ])('normalizes %j to %j', (value, expected) => {
    expect(normalizeProxyUrl(value)).toBe(expected);
  });
});

describe('proxied', () => {
  const request = { method: 'PUT', url: 'https://dav.test:8443/cal/a.ics?x=1', headers: { Depth: '0' }, body: 'b' };

  it('leaves the request alone without a proxy', () => {
    expect(proxied(request, '')).toBe(request);
  });

  it('routes the path through the proxy and names the upstream origin', () => {
    expect(proxied(request, 'https://proxy.example/dav')).toEqual({
      method: 'PUT', url: 'https://proxy.example/dav/cal/a.ics?x=1', body: 'b',
      headers: { Depth: '0', 'X-Upstream': 'https://dav.test:8443' },
    });
  });
});

describe('calendarTransport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the request without credentials and lowercases the response headers', async () => {
    const { calls } = server({ PROPFIND: () => respond(207, '<x/>', { ETag: '"1"', 'Content-Type': 'application/xml' }) });
    const response = await calendarTransport({ method: 'PROPFIND', url: 'https://dav.test/cal/', headers: { Depth: '0' }, body: '<p/>' });
    expect(response).toEqual({ status: 207, body: '<x/>', headers: { etag: '"1"', 'content-type': 'application/xml' } });
    expect(calls).toEqual([{ method: 'PROPFIND', url: 'https://dav.test/cal/', headers: { Depth: '0' }, body: '<p/>' }]);
    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('omit');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('propagates network failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(calendarTransport({ method: 'GET', url: 'https://dav.test/', headers: {} })).rejects.toThrow(TypeError);
  });
});

describe('CalendarSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    server();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await writeSecret(CALENDAR_PASSWORD_SECRET, '');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const inject = (): CalendarSyncService => TestBed.inject(CalendarSyncService);
  /** A service past its start-up: the saved password is loaded and the automatic synchronisation has run. */
  const service = async (): Promise<CalendarSyncService> => {
    const c = inject();
    await settle();
    return c;
  };
  const strings = () => TestBed.inject(SettingsService).t().calendar;
  const authorization = (password: string): string => `Basic ${base64Utf8(`alice:${password}`)}`;

  describe('initial state', () => {
    it('starts disabled with the defaults', async () => {
      const c = inject();
      expect(c.config()).toEqual({ enabled: false, calendarUrl: '', username: '', syncIntervalMinutes: 0 });
      expect(c.proxyUrl()).toBe('');
      expect(c.active()).toBe(false);
      expect(c.status()).toEqual({ state: 'disabled', lastSync: undefined });
      expect(c.busy()).toBe(false);
      expect(c.passwordPersistent()).toBe(true);
      await settle();
      expect(c.hasPassword()).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('restores the saved settings, proxy and last synchronisation', () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(CONFIG));
      localStorage.setItem(PROXY_KEY, 'https://proxy.example/x/');
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: { t1: { href: '/cal/t1.ics', etag: '"1"', hash: 'h' } }, lastSync: '2026-10-01T00:00:00.000Z' }));
      const c = inject();
      expect(c.config()).toEqual({ enabled: true, calendarUrl: 'https://dav.test/cal', username: 'alice', syncIntervalMinutes: 0 });
      expect(c.proxyUrl()).toBe('https://proxy.example/x');
      expect(c.status()).toEqual({ state: 'offline', lastSync: '2026-10-01T00:00:00.000Z' });
    });

    it('falls back to disabled when the saved settings are unreadable', () => {
      localStorage.setItem(CONFIG_KEY, '{"enabled":true');
      expect(inject().config().enabled).toBe(false);
    });

    it('synchronises periodically according to the configured interval, and stops when it is 0', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const c = await service();
      c.configure({ ...CONFIG, syncIntervalMinutes: 5 }, 'pw');
      await settle();
      const periodic = setIntervalSpy.mock.calls.find(([, delay]) => delay === 5 * 60_000);
      expect(periodic).toBeDefined();
      vi.mocked(fetch).mockClear();
      (periodic![0] as () => void)();
      await settle();
      expect(fetch).toHaveBeenCalled();
      c.configure({ ...CONFIG, syncIntervalMinutes: 0 }, null);
      expect(clearIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockClear();
      c.configure({ ...CONFIG, syncIntervalMinutes: 0 }, null);
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['[]'], ['{"baseline":[]}'], ['{"baseline":{"t":null}}'], ['{"baseline":{"t":{"href":"/a"}}}'],
      ['{"baseline":{"t":{"href":"/a","hash":"h","etag":1}}}'], ['{"baseline":{},"lastSync":"yesterday"}'], ['{"nope":1}'],
    ])('drops an unreadable baseline %s', (saved) => {
      localStorage.setItem(BASELINE_KEY, saved);
      expect(inject().status().lastSync).toBeUndefined();
      expect(localStorage.getItem(BASELINE_KEY)).toBeNull();
    });

    it('accepts baseline entries without etag and no lastSync', () => {
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: { t: { href: '/a', hash: 'h' } } }));
      inject();
      expect(localStorage.getItem(BASELINE_KEY)).not.toBeNull();
    });

    it('loads the password saved on the device', async () => {
      await writeSecret(CALENDAR_PASSWORD_SECRET, 'kept');
      const c = inject();
      expect(c.hasPassword()).toBe(false);
      await settle();
      expect(c.hasPassword()).toBe(true);
    });

    it('synchronises at start-up when enabled, waiting for the saved password', async () => {
      await writeSecret(CALENDAR_PASSWORD_SECRET, 'kept');
      localStorage.setItem(CONFIG_KEY, JSON.stringify(CONFIG));
      const { calls } = server();
      const c = await service();
      expect(calls.map((call) => call.method)).toEqual(['REPORT']);
      expect(calls[0].headers['Authorization']).toBe(authorization('kept'));
      expect(c.status().state).toBe('online');
    });

    it('reports a missing password at start-up', async () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(CONFIG));
      const c = await service();
      expect(c.status()).toMatchObject({ state: 'error', message: strings().passwordRequired });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('configure', () => {
    it('refuses an incomplete configuration when enabled', async () => {
      const c = await service();
      expect(c.configure({ enabled: true, calendarUrl: 'ftp://x', username: 'alice' }, 'pw')).toBe(false);
      expect(c.status()).toMatchObject({ state: 'error', message: strings().invalidConfig });
      expect(localStorage.getItem(CONFIG_KEY)).toBeNull();
      expect(c.hasPassword()).toBe(false);
    });

    it('persists the settings, the proxy and the password', async () => {
      const c = await service();
      expect(c.configure(CONFIG, 'pw', ' https://proxy.example/p/ ')).toBe(true);
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '')).toEqual({ enabled: true, calendarUrl: 'https://dav.test/cal', username: 'alice', syncIntervalMinutes: 0 });
      expect(localStorage.getItem(PROXY_KEY)).toBe('https://proxy.example/p');
      expect(c.proxyUrl()).toBe('https://proxy.example/p');
      expect(c.status()).toEqual({ state: 'offline', lastSync: undefined });
      expect(c.hasPassword()).toBe(true);
      expect(c.passwordPersistent()).toBe(true);
      await settle();
      expect(await readSecret(CALENDAR_PASSWORD_SECRET)).toBe('pw');
      c.configure(CONFIG, null, '');
      expect(localStorage.getItem(PROXY_KEY)).toBeNull();
      expect(c.proxyUrl()).toBe('');
      expect(c.hasPassword()).toBe(true);
    });

    it('keeps the proxy when none is given', async () => {
      localStorage.setItem(PROXY_KEY, 'https://proxy.example');
      const c = await service();
      c.configure(CONFIG, 'pw');
      expect(c.proxyUrl()).toBe('https://proxy.example');
      expect(localStorage.getItem(PROXY_KEY)).toBe('https://proxy.example');
    });

    it('forgets the baseline and the password when the server or user changes', async () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...CONFIG, enabled: false }));
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: {}, lastSync: '2026-10-01T00:00:00.000Z' }));
      const c = await service();
      c.configure(CONFIG, 'pw');
      await settle();
      expect(c.status()).toEqual({ state: 'offline', lastSync: '2026-10-01T00:00:00.000Z' });
      expect(localStorage.getItem(BASELINE_KEY)).not.toBeNull();
      c.configure({ ...CONFIG, username: 'bob' }, null);
      expect(localStorage.getItem(BASELINE_KEY)).toBeNull();
      expect(c.hasPassword()).toBe(false);
      expect(c.status()).toEqual({ state: 'offline', lastSync: undefined });
      await settle();
      expect(await readSecret(CALENDAR_PASSWORD_SECRET)).toBe('');
    });

    it('disables the synchronisation while keeping the settings', async () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(CONFIG));
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: {}, lastSync: '2026-10-01T00:00:00.000Z' }));
      const c = await service();
      c.configure({ ...CONFIG, enabled: false }, null);
      expect(c.active()).toBe(false);
      expect(c.status()).toEqual({ state: 'disabled', lastSync: '2026-10-01T00:00:00.000Z' });
      expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '')).toMatchObject({ enabled: false, username: 'alice' });
    });

    it('does not let the password saved earlier override one typed meanwhile', async () => {
      await writeSecret(CALENDAR_PASSWORD_SECRET, 'old');
      const { calls } = server();
      const c = inject();
      c.configure(CONFIG, 'new');
      await settle();
      await c.checkConnection();
      expect(calls[0].headers['Authorization']).toBe(authorization('new'));
    });

    it('reports a session-only password when the device cannot keep secrets', async () => {
      vi.stubGlobal('crypto', {});
      const c = await service();
      expect(c.passwordPersistent()).toBe(false);
      c.configure(CONFIG, 'pw');
      await settle();
      expect(c.hasPassword()).toBe(true);
      expect(c.passwordPersistent()).toBe(false);
    });
  });

  describe('checkConnection', () => {
    it('reports a working connection', async () => {
      const { calls } = server();
      const c = await service();
      c.configure(CONFIG, 'pw');
      const pending = c.checkConnection();
      expect(c.busy()).toBe(true);
      await pending;
      expect(c.busy()).toBe(false);
      expect(c.status()).toEqual({ state: 'online', lastSync: undefined, message: strings().connected });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ method: 'PROPFIND', url: 'https://dav.test/cal', headers: { Depth: '0', Authorization: authorization('pw') } });
    });

    it('goes through the proxy when one is set', async () => {
      const { calls } = server();
      const c = await service();
      c.configure(CONFIG, 'pw', 'https://proxy.example/dav');
      await c.checkConnection();
      expect(calls[0].url).toBe('https://proxy.example/dav/cal');
      expect(calls[0].headers['X-Upstream']).toBe('https://dav.test');
    });

    it('checks a disabled but complete configuration', async () => {
      const c = await service();
      c.configure({ ...CONFIG, enabled: false }, 'pw');
      await c.checkConnection();
      expect(c.status()).toEqual({ state: 'disabled', lastSync: undefined, message: strings().connectedDisabled });
    });

    it('reports an incomplete configuration or a missing password', async () => {
      const c = await service();
      await c.checkConnection();
      expect(c.status()).toMatchObject({ state: 'error', message: strings().invalidConfig });
      c.configure({ ...CONFIG, enabled: false }, null);
      await c.checkConnection();
      expect(c.status()).toMatchObject({ state: 'error', message: strings().passwordRequired });
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      [(): Response => respond(401), 'error', (s: ReturnType<typeof strings>) => s.authError],
      [(): Response => respond(500), 'error', (s: ReturnType<typeof strings>) => s.serverError('Server answered 500')],
      [(): never => { throw new TypeError('Failed to fetch'); }, 'offline', (s: ReturnType<typeof strings>) => s.networkError],
      [(): never => { throw new DOMException('timeout', 'TimeoutError'); }, 'offline', (s: ReturnType<typeof strings>) => s.networkError],
      [(): never => { throw new DOMException('aborted', 'AbortError'); }, 'offline', (s: ReturnType<typeof strings>) => s.networkError],
      [(): never => { throw new DOMException('odd', 'DataError'); }, 'error', (s: ReturnType<typeof strings>) => expect.stringContaining('odd') as unknown as string],
      [(): never => { throw new Error('boom'); }, 'error', (s: ReturnType<typeof strings>) => s.serverError('boom')],
      [(): never => { throw 'text'; }, 'error', (s: ReturnType<typeof strings>) => s.serverError('text')],
    ])('maps failure %#', async (answer, state, message) => {
      server({ PROPFIND: answer });
      const c = await service();
      c.configure(CONFIG, 'pw');
      await c.checkConnection();
      expect(c.status()).toEqual({ state, lastSync: undefined, message: message(strings()) });
    });
  });

  describe('syncNow', () => {
    it('does nothing while disabled', async () => {
      const c = await service();
      c.configure({ ...CONFIG, enabled: false }, 'pw');
      await c.syncNow();
      expect(fetch).not.toHaveBeenCalled();
      expect(c.status().state).toBe('disabled');
    });

    it('uploads local transactions and remembers the server state', async () => {
      localStorage.setItem(DATA_KEY, JSON.stringify({ months: { '2026-10': [tx()] }, categories: DEFAULT_CATEGORIES, recurrences: [], thresholds: { low: 0, medium: 1, high: 2 } }));
      const { calls } = server();
      const c = await service();
      c.configure(CONFIG, 'pw');
      await c.syncNow();
      expect(calls.map((call) => call.method)).toEqual(['REPORT', 'PUT']);
      expect(calls[0].headers['Depth']).toBe('1');
      expect(calls[1].url).toBe('https://dav.test/cal/t1.ics');
      expect(calls[1].headers['If-None-Match']).toBe('*');
      expect(calls[1].body).toContain('UID:t1');
      expect(c.status()).toEqual({ state: 'online', lastSync: '2026-10-13T10:00:00.000Z', message: undefined });
      expect(JSON.parse(localStorage.getItem(BASELINE_KEY) ?? '')).toEqual({
        baseline: {
          t1: { href: 'https://dav.test/cal/t1.ics', etag: '"e1"', hash: expect.any(String) },
          '@categories': { href: CATEGORIES_HREF, etag: '"c1"', hash: expect.any(String) },
        },
        lastSync: '2026-10-13T10:00:00.000Z',
      });
    });

    it('downloads remote transactions into the budget', async () => {
      const remote = tx({ id: 'r9', date: '2026-11-02', category: 'Vacances', amount: 12 });
      server({ REPORT: () => respond(207, calendarWith(DEFAULT_CATEGORIES, { href: '/cal/r9.ics', etag: 'z', transaction: remote })) });
      const c = await service();
      const budget = TestBed.inject(BudgetService);
      c.configure(CONFIG, 'pw');
      await c.syncNow();
      expect(budget.transactionsOf('2026-11')).toEqual([remote]);
      expect(budget.categories().some((category) => category.name === 'Vacances')).toBe(true);
      expect(c.status().state).toBe('online');
    });

    describe('categories', () => {
      const remoteList: Category[] = [{ name: 'Vacances', icon: 'tabler:plane' }, { name: 'Alimentation', icon: 'tabler:bus' }];
      const savedCategories = (): Category[] => (JSON.parse(localStorage.getItem(DATA_KEY) ?? '') as { categories: Category[] }).categories;

      it('takes the list from the calendar, order and icons included', async () => {
        server({ REPORT: () => respond(207, calendarWith(remoteList)) });
        const c = await service();
        const budget = TestBed.inject(BudgetService);
        c.configure(CONFIG, 'pw');
        await c.syncNow();
        // The local-only default categories are kept after the calendar's own.
        expect(budget.categories().slice(0, 2)).toEqual(remoteList);
        expect(budget.categories().length).toBe(DEFAULT_CATEGORIES.length + 1);
        expect(savedCategories()).toEqual(budget.categories());
      });

      it('adds the categories of downloaded transactions, with the default icon', async () => {
        const remote = tx({ id: 'r9', category: 'Cadeaux' });
        server({ REPORT: () => respond(207, calendarWith(DEFAULT_CATEGORIES, { href: '/cal/r9.ics', etag: 'z', transaction: remote })) });
        const c = await service();
        const budget = TestBed.inject(BudgetService);
        c.configure(CONFIG, 'pw');
        await c.syncNow();
        expect(budget.categories().map((category) => category.name)).toContain('Cadeaux');
        expect(budget.transactionsOf('2026-10')).toEqual([remote]);
      });

      it('uploads a local change once the list is saved, and tolerates the reserved baseline key', async () => {
        const { calls } = server();
        const c = await service();
        const budget = TestBed.inject(BudgetService);
        c.configure(CONFIG, 'pw');
        await c.syncNow();
        expect(calls.map((call) => call.method)).toEqual(['REPORT']);
        expect(Object.keys(JSON.parse(localStorage.getItem(BASELINE_KEY) ?? '').baseline)).toEqual(['@categories']);
        budget.addCategory('Cadeaux', 'tabler:gift');
        vi.advanceTimersByTime(2000);
        await settle();
        const put = calls.find((call) => call.method === 'PUT');
        expect(put?.url).toBe('https://dav.test/cal/categories.ics');
        expect(put?.headers['If-Match']).toBe('"c1"');
        expect(put?.body).toContain('Cadeaux');
        // A restart reads the baseline holding the reserved key without dropping it.
        TestBed.resetTestingModule();
        const again = await service();
        expect(again.status().lastSync).toBe('2026-10-13T10:00:02.000Z');
      });

      it('applies renames and reorders by synchronising after each edit', async () => {
        const { calls } = server();
        const c = await service();
        const budget = TestBed.inject(BudgetService);
        c.configure(CONFIG, 'pw');
        await c.syncNow();
        budget.updateCategory('Logement', { icon: 'tabler:home' });
        vi.advanceTimersByTime(2000);
        await settle();
        expect(calls.filter((call) => call.method === 'REPORT')).toHaveLength(2);
      });

      it('keeps a local edit made while the calendar list was being fetched', async () => {
        const report = deferred<Response>();
        const { calls } = server({ REPORT: () => (calls.length === 1 ? report.promise : respond(207, calendarWith(remoteList))) });
        const c = await service();
        const budget = TestBed.inject(BudgetService);
        c.configure(CONFIG, 'pw');
        const run = c.syncNow();
        await settle(1);
        budget.addCategory('Cadeaux', 'tabler:gift');
        report.resolve(respond(207, calendarWith(remoteList)));
        await run;
        await settle();
        expect(budget.categories().map((category) => category.name)).toContain('Cadeaux');
        expect(savedCategories().map((category) => category.name)).toContain('Cadeaux');
      });
    });

    it('counts conflicts and asks to retry', async () => {
      localStorage.setItem(DATA_KEY, JSON.stringify({ months: { '2026-10': [tx()] }, categories: DEFAULT_CATEGORIES, recurrences: [], thresholds: { low: 0, medium: 1, high: 2 } }));
      server({ PUT: () => respond(412) });
      const c = await service();
      c.configure(CONFIG, 'pw');
      await c.syncNow();
      expect(c.status()).toMatchObject({ state: 'online', message: strings().conflicts(1) });
    });

    it('reports a failure and keeps the last synchronisation date', async () => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(CONFIG));
      localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: {}, lastSync: '2026-10-01T00:00:00.000Z' }));
      server({ REPORT: () => respond(403) });
      const c = await service();
      c.configure(CONFIG, 'pw');
      await c.syncNow();
      expect(c.status()).toEqual({ state: 'error', lastSync: '2026-10-01T00:00:00.000Z', message: strings().authError });
      expect(localStorage.getItem(BASELINE_KEY)).not.toBeNull();
    });

    it('ignores the outcome of a run made obsolete by a reconfiguration', async () => {
      const report = deferred<Response>();
      server({ REPORT: () => report.promise });
      const c = await service();
      c.configure(CONFIG, 'pw');
      const pending = c.syncNow();
      c.configure({ ...CONFIG, calendarUrl: 'https://other.test/cal' }, 'pw');
      report.resolve(respond(207, calendarWith()));
      await pending;
      expect(c.status()).toEqual({ state: 'offline', lastSync: undefined });
      expect(localStorage.getItem(BASELINE_KEY)).toBeNull();
    });

    it('ignores an error from a run made obsolete by a reconfiguration', async () => {
      const report = deferred<Response>();
      server({ REPORT: () => report.promise });
      const c = await service();
      c.configure(CONFIG, 'pw');
      const pending = c.syncNow();
      c.configure({ ...CONFIG, enabled: false }, null);
      report.reject(new Error('late'));
      await pending;
      expect(c.status()).toEqual({ state: 'disabled', lastSync: undefined });
    });

    it('shares one run between concurrent requests and runs again for changes made meanwhile', async () => {
      const report = deferred<Response>();
      const { calls } = server({ REPORT: () => (calls.length === 1 ? report.promise : respond(207, calendarWith())) });
      const c = await service();
      const budget = TestBed.inject(BudgetService);
      c.configure(CONFIG, 'pw');
      const first = c.syncNow();
      expect(c.syncNow()).toBe(first);
      await settle(1);
      expect(calls).toHaveLength(1);
      budget.add({ date: '2026-10-02', description: 'x', category: 'Alimentation', kind: 'expense', amount: 1 });
      report.resolve(respond(207, calendarWith()));
      await first;
      await settle();
      expect(calls.map((call) => call.method)).toEqual(['REPORT', 'REPORT', 'PUT']);
      expect(c.busy()).toBe(false);
    });
  });

  describe('triggers', () => {
    it('synchronises two seconds after a change', async () => {
      const { calls } = server();
      const c = await service();
      const budget = TestBed.inject(BudgetService);
      c.configure(CONFIG, 'pw');
      await settle();
      budget.add({ date: '2026-10-02', description: 'x', category: 'Alimentation', kind: 'expense', amount: 1 });
      budget.remove(budget.transactions()[0].id);
      vi.advanceTimersByTime(1999);
      expect(calls).toHaveLength(0);
      vi.advanceTimersByTime(1);
      await settle();
      expect(calls.map((call) => call.method)).toEqual(['REPORT']);
    });

    it('does not schedule anything while disabled', async () => {
      const c = await service();
      const budget = TestBed.inject(BudgetService);
      budget.add({ date: '2026-10-02', description: 'x', category: 'Alimentation', kind: 'expense', amount: 1 });
      vi.advanceTimersByTime(5000);
      expect(fetch).not.toHaveBeenCalled();
      expect(c.status().state).toBe('disabled');
    });

    it('synchronises when the network or the page comes back', async () => {
      const { calls } = server();
      const c = await service();
      c.configure(CONFIG, 'pw');
      await settle();
      window.dispatchEvent(new Event('online'));
      await settle();
      expect(calls).toHaveLength(1);
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await settle();
      expect(calls).toHaveLength(1);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await settle();
      expect(calls).toHaveLength(2);
    });

    it('stops listening once destroyed', async () => {
      const { calls } = server();
      const c = await service();
      const budget = TestBed.inject(BudgetService);
      c.configure(CONFIG, 'pw');
      await settle();
      budget.add({ date: '2026-10-02', description: 'x', category: 'Alimentation', kind: 'expense', amount: 1 });
      c.ngOnDestroy();
      vi.advanceTimersByTime(3000);
      window.dispatchEvent(new Event('online'));
      await c.syncNow();
      await c.checkConnection();
      await settle();
      expect(calls).toHaveLength(0);
      expect(c.busy()).toBe(false);
    });

    it('does not take the saved password once destroyed', async () => {
      await writeSecret(CALENDAR_PASSWORD_SECRET, 'kept');
      const c = inject();
      c.ngOnDestroy();
      await settle();
      expect(c.hasPassword()).toBe(false);
    });
  });
});
