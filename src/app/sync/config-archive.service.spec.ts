import { TestBed } from '@angular/core/testing';
import { ConfigFileError, DEFAULT_CATEGORIES, sealConfig, webCryptoConfigCipher, type ConfigData, type WebCryptoLike } from 'budget-lib';

import { BudgetService } from '../data/budget.service';
import { CalendarSyncService } from './calendar-sync.service';
import { ConfigArchiveService, downloadText } from './config-archive.service';
import { CALENDAR_PASSWORD_SECRET, readSecret, writeSecret } from '../security/secrets';
import { SettingsService } from '../preferences/settings.service';

const DATA_KEY = 'budget-pwa:data:v1';
const CONFIG_KEY = 'budget-pwa:calendar:v1';
const PROXY_KEY = 'budget-pwa:calendar-proxy:v1';

const cipher = webCryptoConfigCipher(crypto as unknown as WebCryptoLike);

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const config = (over: Partial<ConfigData> = {}): ConfigData => ({
  general: { language: 'en', currency: 'USD', dateFormat: 'yyyy-mm-dd', amountFormat: 'comma-dot', theme: 'light' },
  thresholds: { low: 10, medium: 20, high: 30 },
  calendar: { enabled: true, calendarUrl: 'https://cal.example.org/cal/', username: 'bob', proxyUrl: 'https://proxy.example.org/', password: 'secret' },
  bank: null,
  ...over,
});

describe('downloadText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers the text as a file', async () => {
    const create = vi.fn(() => 'blob:cfg');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:cfg');
      expect(this.download).toBe('a.txt');
    });
    downloadText('a.txt', 'hello', 'text/plain');
    const blob = create.mock.calls[0][0 as never] as unknown as Blob;
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('hello');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:cfg');
    click.mockRestore();
  });
});

describe('ConfigArchiveService', () => {
  let service: ConfigArchiveService;
  let budget: BudgetService;
  let settings: SettingsService;
  let calendar: CalendarSyncService;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: {}, categories: DEFAULT_CATEGORIES, recurrences: [], thresholds: { low: 100, medium: 500, high: 1000 },
    }));
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigArchiveService);
    budget = TestBed.inject(BudgetService);
    settings = TestBed.inject(SettingsService);
    calendar = TestBed.inject(CalendarSyncService);
    await settle();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await writeSecret(CALENDAR_PASSWORD_SECRET, '');
    vi.unstubAllGlobals();
  });

  it('collects the settings, thresholds, calendar access, proxy and password', async () => {
    settings.update({ currency: 'CHF' });
    calendar.configure({ enabled: true, calendarUrl: 'https://cal.example.org/cal/', username: 'me' }, 'pw', 'https://proxy.example.org/');
    const data = await service.collect();
    expect(data).toEqual({
      general: { ...settings.settings(), currency: 'CHF' },
      thresholds: { low: 100, medium: 500, high: 1000 },
      calendar: { enabled: true, calendarUrl: 'https://cal.example.org/cal', username: 'me', syncIntervalMinutes: 0, proxyUrl: 'https://proxy.example.org', password: 'pw' },
      bank: null,
    });
  });

  it('exports an encrypted file that imports back on another device', async () => {
    vi.setSystemTime(new Date('2026-10-14T12:00:00'));
    settings.update({ language: 'en', theme: 'light' });
    budget.setThresholds({ low: 1, medium: 2, high: 3 });
    calendar.configure({ enabled: true, calendarUrl: 'https://cal.example.org/cal/', username: 'me' }, 'pw', 'https://proxy.example.org/');
    const create = vi.fn(() => 'blob:cfg');
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: create, revokeObjectURL: vi.fn() }));
    let name = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
    await service.exportEncrypted('correct horse battery');
    click.mockRestore();
    vi.useRealTimers();
    expect(name).toBe('budget-config-2026-10-14.budgetcfg');
    const text = await (create.mock.calls[0][0 as never] as unknown as Blob).text();
    expect(JSON.parse(text)).toMatchObject({ format: 'budget-app-config-encrypted', exportedAt: expect.any(String) });
    expect(text).not.toContain('cal.example.org');

    // A fresh device: nothing configured yet (and the real URL class back, the proxy address is parsed with it).
    vi.unstubAllGlobals();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    TestBed.resetTestingModule();
    await writeSecret(CALENDAR_PASSWORD_SECRET, '');
    localStorage.clear();
    TestBed.configureTestingModule({});
    const other = TestBed.inject(ConfigArchiveService);
    await settle();
    const summary = await other.importEncrypted(text, 'correct horse battery');
    expect(summary).toEqual({ calendar: true, calendarPassword: true, bankIgnored: false });
    expect(TestBed.inject(SettingsService).settings()).toMatchObject({ language: 'en', theme: 'light' });
    expect(TestBed.inject(BudgetService).thresholds()).toEqual({ low: 1, medium: 2, high: 3 });
    const imported = TestBed.inject(CalendarSyncService);
    expect(imported.config()).toEqual({ enabled: true, calendarUrl: 'https://cal.example.org/cal', username: 'me', syncIntervalMinutes: 0 });
    expect(imported.proxyUrl()).toBe('https://proxy.example.org');
    expect(imported.hasPassword()).toBe(true);
    await settle();
    expect(await readSecret(CALENDAR_PASSWORD_SECRET)).toBe('pw');
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}')).toMatchObject({ username: 'me' });
    expect(localStorage.getItem(PROXY_KEY)).toBe('https://proxy.example.org');
  });

  it('refuses a weak passphrase before writing anything', async () => {
    const create = vi.fn(() => 'blob:cfg');
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: create, revokeObjectURL: vi.fn() }));
    await expect(service.exportEncrypted('short')).rejects.toMatchObject({ code: 'weak-passphrase' });
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the saved password when the file has none, and reports an ignored bank section', async () => {
    calendar.configure({ enabled: false, calendarUrl: 'https://cal.example.org/cal/', username: 'bob' }, 'kept', '');
    await settle();
    const data = config({
      calendar: { enabled: false, calendarUrl: 'https://cal.example.org/cal/', username: 'bob', proxyUrl: '', password: '' },
      bank: {
        config: { applicationId: 'app', bankName: 'Bank', bankCountry: 'FR', bankConsentSeconds: 3600, redirectUrl: 'https://x', importFrom: '2026-01-01' },
        privateKey: '',
      },
    });
    const text = await sealConfig(data, 'a long passphrase', cipher);
    const summary = await service.importEncrypted(text, 'a long passphrase');
    expect(summary).toEqual({ calendar: true, calendarPassword: false, bankIgnored: true });
    expect(calendar.hasPassword()).toBe(true);
    expect(await calendar.readPassword()).toBe('kept');
    expect(settings.settings()).toMatchObject({ currency: 'USD', dateFormat: 'yyyy-mm-dd' });
    expect(budget.thresholds()).toEqual({ low: 10, medium: 20, high: 30 });
  });

  it('imports an incomplete calendar as disabled rather than failing', async () => {
    const data = config({ calendar: { enabled: true, calendarUrl: '', username: '', proxyUrl: '', password: '' } });
    const text = await sealConfig(data, 'a long passphrase', cipher);
    const summary = await service.importEncrypted(text, 'a long passphrase');
    expect(summary).toEqual({ calendar: false, calendarPassword: false, bankIgnored: false });
    expect(calendar.config().enabled).toBe(false);
    expect(budget.thresholds()).toEqual({ low: 10, medium: 20, high: 30 });
  });

  it('maps the failures of the library to error codes', async () => {
    const text = await sealConfig(config(), 'a long passphrase', cipher);
    await expect(service.importEncrypted(text, 'wrong passphrase')).rejects.toMatchObject({ code: 'passphrase' });
    await expect(service.importEncrypted('{"format":"nope"}', 'a long passphrase')).rejects.toMatchObject({ code: 'format' });
    await expect(service.importEncrypted('not json', 'a long passphrase')).rejects.toBeInstanceOf(ConfigFileError);
    expect(settings.settings().currency).toBe('EUR');
    expect(budget.thresholds().low).toBe(100);
  });
});
