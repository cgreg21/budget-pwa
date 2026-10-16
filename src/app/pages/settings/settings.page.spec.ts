import { provideRouter, Router } from '@angular/router';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  createArchive, DEFAULT_CATEGORIES, sealConfig, webCryptoConfigCipher, type ConfigData, type Recurrence, type WebCryptoLike,
} from 'budget-lib';

import { BudgetService } from '../../data/budget.service';
import { CalendarSyncService } from '../../sync/calendar-sync.service';
import { ConfigArchiveService } from '../../sync/config-archive.service';
import { DialogService } from '../../ui/dialog.service';
import { InstallService } from '../../pwa/install.service';
import { SettingsService } from '../../preferences/settings.service';
import { SnackbarService } from '../../ui/snackbar.service';
import { SettingsPage } from './settings.page';

const DATA_KEY = 'budget-pwa:data:v1';
const CONFIG_KEY = 'budget-pwa:calendar:v1';
const BASELINE_KEY = 'budget-pwa:calendar-baseline:v1';

const rec = (over: Partial<Recurrence> = {}): Recurrence => ({
  id: 'r1', description: 'Loyer', category: 'Logement', kind: 'expense', amount: 700, day: 3, frequency: 'monthly',
  startMonth: '2026-01', ...over,
});

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

/** Waits for a dialog to open; key derivation makes the import noticeably asynchronous. */
const untilDialog = async (dialogs: DialogService): Promise<void> => {
  for (let i = 0; i < 400 && dialogs.current() === null; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 5));
};

const MULTISTATUS = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:href>/cal/</d:href>'
  + '<d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>'
  + '</d:response></d:multistatus>';

describe('SettingsPage', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;
  let router: Router;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    fetchMock = vi.fn(async () => new Response(MULTISTATUS, { status: 207, headers: { 'content-type': 'application/xml' } }));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: { '2026-10': [{ id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50 }] },
      categories: DEFAULT_CATEGORIES, recurrences: [rec()], thresholds: { low: 100, medium: 500, high: 1000 },
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const page = async (): Promise<ComponentFixture<SettingsPage>> => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await settle();
    return fixture;
  };

  it('starts from the stored thresholds and calendar config', async () => {
    const c = (await page()).componentInstance;
    expect([c.low(), c.medium(), c.high()]).toEqual(['100,00', '500,00', '1000,00']);
    expect(c.calendarEnabled()).toBe(false);
    expect(c.calendarUrl()).toBe('');
    expect(c.calendarProxy()).toBe('');
    expect(c.calendarStatusText()).toBe(`${s.t().calendar.states.disabled} - ${s.t().calendar.lastSync(s.t().calendar.never)}`);
  });

  it('shows the last sync time in the status', async () => {
    localStorage.setItem(BASELINE_KEY, JSON.stringify({ baseline: {}, lastSync: new Date('2026-10-12T09:07:00').toISOString() }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    s = TestBed.inject(SettingsService);
    const c = (await page()).componentInstance;
    expect(c.calendarStatusText()).toContain(s.t().calendar.lastSync(`${s.formatDate('2026-10-12')} 09:07`));
  });

  it('labels the options', async () => {
    const c = (await page()).componentInstance;
    expect(c.languageName('fr')).toBe('Fran\u00E7ais');
    expect(c.languageName('en')).toBe('English');
    expect(c.dateFormatName('locale')).toBe(s.t().settings.formatLocale);
    expect(c.dateFormatName('dd-mm-yyyy')).toBe('DD-MM-YYYY');
    expect(c.amountFormatName('locale')).toBe(s.t().settings.formatLocale);
    expect(c.amountFormatName('space-comma')).toBe('1 234,56');
    expect(c.amountFormatName('comma-dot')).toBe('1,234.56');
    expect(c.themeName('system')).toBe(s.t().settings.themeSystem);
    expect(c.themeName('dark')).toBe(s.t().settings.themeDark);
  });

  it('applies the picked options and ignores a cancelled pick', async () => {
    const c = (await page()).componentInstance;
    let pending = c.pickLanguage();
    expect(dialogs.current()?.actions).toEqual(['Fran\u00E7ais', 'English']);
    dialogs.close('English');
    await pending;
    expect(s.settings().language).toBe('en');

    pending = c.pickCurrency();
    dialogs.close('USD');
    await pending;
    expect(s.settings().currency).toBe('USD');

    pending = c.pickDateFormat();
    dialogs.close('YYYY-MM-DD');
    await pending;
    expect(s.settings().dateFormat).toBe('yyyy-mm-dd');

    pending = c.pickAmountFormat();
    dialogs.close('1,234.56');
    await pending;
    expect(s.settings().amountFormat).toBe('comma-dot');

    pending = c.pickTheme();
    dialogs.close(s.t().settings.themeDark);
    await pending;
    expect(s.settings().theme).toBe('dark');

    pending = c.pickTheme();
    dialogs.close(null);
    await pending;
    expect(s.settings().theme).toBe('dark');
  });

  it('saves ordered thresholds and rejects the others', async () => {
    const c = (await page()).componentInstance;
    c.low.set('300');
    c.medium.set('200');
    await c.saveThresholds();
    expect(c.message()).toBe(s.t().settings.thresholdsOrder);
    expect(b.thresholds().low).toBe(100);

    c.medium.set('abc');
    await c.saveThresholds();
    expect(c.message()).toBe(s.t().settings.thresholdsOrder);

    c.low.set('50');
    c.medium.set('200');
    c.high.set('900');
    await c.saveThresholds();
    expect(c.message()).toBe('');
    expect(b.thresholds()).toEqual({ low: 50, medium: 200, high: 900 });
    expect(TestBed.inject(SnackbarService).current()?.text).toBe(s.t().snackbar.thresholdsSaved);
  });

  it('exports a backup as a JSON download', async () => {
    const create = vi.fn(() => 'blob:budget');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:budget');
      expect(this.download).toBe('budget-2026-10.json');
    });
    (await page()).componentInstance.exportBackup();
    expect(create).toHaveBeenCalledTimes(1);
    const blob = create.mock.calls[0][0 as never] as unknown as Blob;
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toMatchObject({ format: expect.any(String), months: { '2026-10': expect.any(Array) } });
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:budget');
    click.mockRestore();
  });

  const fileEvent = (content: string | null): { event: Event; input: HTMLInputElement } => {
    const input = document.createElement('input');
    input.type = 'file';
    const files = content === null ? [] : [new File([content], 'b.json', { type: 'application/json' })];
    Object.defineProperty(input, 'files', { value: files });
    Object.defineProperty(input, 'value', { value: 'C:\\fake\\b.json', writable: true });
    return { event: { target: input } as unknown as Event, input };
  };

  it('imports a backup after confirmation', async () => {
    const c = (await page()).componentInstance;
    const archive = createArchive({
      months: { '2026-11': [{ id: 'n', date: '2026-11-02', description: 'Nov', category: 'Alimentation', kind: 'income', amount: 5 }] },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }], recurrences: [], thresholds: { low: 1, medium: 2, high: 3 },
    });
    const { event, input } = fileEvent(JSON.stringify(archive));
    const pending = c.importBackup(event);
    await settle();
    expect(dialogs.current()?.message).toBe(s.t().backup.confirm);
    dialogs.close(s.t().common.save);
    await pending;
    expect(c.backupError()).toBe('');
    expect(b.transactionsOf('2026-11')).toHaveLength(1);
    expect(b.thresholds()).toEqual({ low: 1, medium: 2, high: 3 });
    expect(input.value).toBe('');
  });

  it('keeps the data when the import is declined, and reports invalid files', async () => {
    const c = (await page()).componentInstance;
    const valid = createArchive({ months: {}, categories: [{ name: 'X', icon: 'folder-symbolic' }], recurrences: [], thresholds: { low: 1, medium: 2, high: 3 } });
    let pending = c.importBackup(fileEvent(JSON.stringify(valid)).event);
    await settle();
    dialogs.close(null);
    await pending;
    expect(b.thresholds().low).toBe(100);

    await c.importBackup(fileEvent('{"nope":1}').event);
    expect(c.backupError()).toBe(s.t().backup.invalid);

    await c.importBackup(fileEvent('{broken').event);
    expect(c.backupError()).toMatch(/JSON/);

    pending = c.importBackup(fileEvent(JSON.stringify(valid)).event);
    await settle();
    dialogs.close(s.t().common.save);
    await pending;
    expect(c.backupError()).toBe('');

    await c.importBackup(fileEvent(null).event);
    expect(c.backupError()).toBe('');
  });

  it('refuses an incomplete calendar config', async () => {
    const c = (await page()).componentInstance;
    const calendar = TestBed.inject(CalendarSyncService);
    c.calendarEnabled.set(true);
    c.calendarPassword.set('pw');
    await c.saveCalendar();
    expect(calendar.status().state).toBe('error');
    expect(c.calendarPassword()).toBe('pw');
    expect(calendar.config().enabled).toBe(false);
  });

  it('saves the calendar config, syncs when enabled and clears the typed password', async () => {
    const c = (await page()).componentInstance;
    const calendar = TestBed.inject(CalendarSyncService);
    c.calendarEnabled.set(true);
    c.calendarUrl.set('https://cal.example.org/cal/');
    c.calendarUser.set('me');
    c.calendarPassword.set('pw');
    c.calendarProxy.set('https://proxy.example.org/');
    await c.saveCalendar();
    await settle();
    expect(c.calendarPassword()).toBe('');
    expect(c.calendarProxy()).toBe('https://proxy.example.org');
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}')).toMatchObject({ enabled: true, username: 'me' });
    expect(calendar.hasPassword()).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe('https://proxy.example.org/cal');
    expect(new Headers(init.headers).get('X-Upstream')).toBe('https://cal.example.org');
  });

  it('checks the connection on demand', async () => {
    const c = (await page()).componentInstance;
    const calendar = TestBed.inject(CalendarSyncService);
    const check = vi.spyOn(calendar, 'checkConnection').mockResolvedValue();
    const sync = vi.spyOn(calendar, 'syncNow').mockResolvedValue();
    c.calendarUrl.set('https://cal.example.org/cal/');
    c.calendarUser.set('me');
    await c.saveCalendar('check');
    expect(check).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();
    await c.saveCalendar('sync');
    expect(sync).not.toHaveBeenCalled();
    c.calendarEnabled.set(true);
    c.calendarPassword.set('pw');
    await c.saveCalendar('sync');
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('toggles the calendar and reflects whether it really got enabled', async () => {
    const c = (await page()).componentInstance;
    const calendar = TestBed.inject(CalendarSyncService);
    vi.spyOn(calendar, 'syncNow').mockResolvedValue();
    await c.toggleCalendar();
    expect(c.calendarEnabled()).toBe(false);
    c.calendarUrl.set('https://cal.example.org/cal/');
    c.calendarUser.set('me');
    c.calendarPassword.set('pw');
    await c.toggleCalendar();
    expect(c.calendarEnabled()).toBe(true);
    expect(calendar.active()).toBe(true);
    await c.toggleCalendar();
    expect(c.calendarEnabled()).toBe(false);
    expect(calendar.active()).toBe(false);
  });

  it('shows the install section when the app can be installed', async () => {
    const fixture = await page();
    fixture.componentInstance.tab.set('data');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(s.t().install.settingsHelp);
    TestBed.inject(InstallService).canInstall.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(s.t().install.settingsHelp);
  });

  it('organises the options in tabs, opening on General', async () => {
    const fixture = await page();
    const el: HTMLElement = fixture.nativeElement;
    const tabs = [...el.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(Object.values(s.t().settings.tabs));
    expect(el.querySelector('#calendar-url')).toBeNull();

    tabs[2].click();
    fixture.detectChanges();
    expect(el.querySelector('#calendar-url')).not.toBeNull();
    expect(el.querySelector('#threshold-low')).toBeNull();
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
  });

  describe('encrypted configuration', () => {
    let archive: ConfigArchiveService;

    beforeEach(() => {
      archive = TestBed.inject(ConfigArchiveService);
    });

    it('asks for a matching passphrase of 8 characters before exporting', async () => {
      const fixture = await page();
      const c = fixture.componentInstance;
      const exported = vi.spyOn(archive, 'exportEncrypted').mockResolvedValue();
      c.exportConfig();
      fixture.detectChanges();
      expect(c.passphraseMode()).toBe('export');
      expect(fixture.nativeElement.querySelector('#config-passphrase-confirm')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain(s.t().config.passphraseHelp);

      c.passphrase.set('short');
      await c.submitPassphrase();
      expect(c.passphraseError()).toBe(s.t().config.errors['weak-passphrase']);

      c.passphrase.set('long enough');
      c.passphraseConfirm.set('long enougH');
      await c.submitPassphrase();
      expect(c.passphraseError()).toBe(s.t().config.passphraseMismatch);
      expect(exported).not.toHaveBeenCalled();

      c.passphraseConfirm.set('long enough');
      await c.submitPassphrase();
      expect(exported).toHaveBeenCalledWith('long enough');
      expect(c.passphraseMode()).toBeNull();
      expect(c.passphrase()).toBe('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#config-passphrase')).toBeNull();
    });

    it('shows the export failure in the sheet and lets the user cancel', async () => {
      const fixture = await page();
      const c = fixture.componentInstance;
      vi.spyOn(archive, 'exportEncrypted').mockRejectedValue(new Error('disk full'));
      c.exportConfig();
      c.passphrase.set('long enough');
      c.passphraseConfirm.set('long enough');
      await c.submitPassphrase();
      expect(c.passphraseError()).toBe('disk full');
      expect(c.passphraseMode()).toBe('export');
      c.closePassphrase();
      expect(c.passphraseMode()).toBeNull();
      expect(c.passphraseError()).toBe('');
      await c.submitPassphrase();
    });

    it('ignores submissions and dismissals while busy', async () => {
      const c = (await page()).componentInstance;
      let release: () => void = () => undefined;
      vi.spyOn(archive, 'exportEncrypted').mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
      c.exportConfig();
      c.passphrase.set('long enough');
      c.passphraseConfirm.set('long enough');
      const pending = c.submitPassphrase();
      expect(c.passphraseBusy()).toBe(true);
      c.closePassphrase();
      await c.submitPassphrase();
      expect(c.passphraseMode()).toBe('export');
      release();
      await pending;
      expect(c.passphraseBusy()).toBe(false);
      expect(c.passphraseMode()).toBeNull();
    });

    it('imports a configuration file with its passphrase and summarises it', async () => {
      const fixture = await page();
      const c = fixture.componentInstance;
      const calendar = TestBed.inject(CalendarSyncService);
      vi.spyOn(calendar, 'syncNow').mockResolvedValue();
      const data: ConfigData = {
        general: { language: 'en', currency: 'GBP', dateFormat: 'locale', amountFormat: 'locale', theme: 'light' },
        thresholds: { low: 5, medium: 6, high: 7 },
        calendar: { enabled: true, calendarUrl: 'https://cal.example.org/cal/', username: 'bob', proxyUrl: 'https://proxy.example.org', password: 'pw' },
        bank: { config: { applicationId: 'app', bankName: 'Bank', bankCountry: 'FR', bankConsentSeconds: 3600, redirectUrl: 'https://x', importFrom: '2026-01-01' }, privateKey: '' },
      };
      const text = await sealConfig(data, 'a long passphrase', webCryptoConfigCipher(crypto as unknown as WebCryptoLike));
      const { event, input } = fileEvent(text);
      await c.importConfig(event);
      expect(input.value).toBe('');
      expect(c.passphraseMode()).toBe('import');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#config-passphrase-confirm')).toBeNull();

      c.passphrase.set('wrong passphrase');
      await c.submitPassphrase();
      expect(c.passphraseError()).toBe(s.t().config.errors.passphrase);
      expect(b.thresholds().low).toBe(100);

      c.passphrase.set('a long passphrase');
      const pending = c.submitPassphrase();
      await untilDialog(dialogs);
      expect(c.passphraseMode()).toBeNull();
      const t = s.t().config;
      expect(dialogs.current()?.message).toBe(`${t.imported} ${t.importedCalendarPassword} ${t.bankIgnored}`);
      dialogs.close(s.t().common.ok);
      await pending;
      expect(s.settings().language).toBe('en');
      expect(b.thresholds()).toEqual({ low: 5, medium: 6, high: 7 });
      expect([c.low(), c.medium(), c.high()]).toEqual(['5.00', '6.00', '7.00']);
      expect(c.calendarEnabled()).toBe(true);
      expect(c.calendarUrl()).toBe('https://cal.example.org/cal');
      expect(c.calendarUser()).toBe('bob');
      expect(c.calendarProxy()).toBe('https://proxy.example.org');
      expect(calendar.hasPassword()).toBe(true);
    });

    it('describes a file without calendar access, and an unreadable file', async () => {
      const c = (await page()).componentInstance;
      vi.spyOn(archive, 'importEncrypted')
        .mockResolvedValueOnce({ calendar: false, calendarPassword: false, bankIgnored: false })
        .mockResolvedValueOnce({ calendar: true, calendarPassword: false, bankIgnored: false });
      await c.importConfig(fileEvent('x').event);
      c.passphrase.set('a long passphrase');
      let pending = c.submitPassphrase();
      await untilDialog(dialogs);
      expect(dialogs.current()?.message).toBe(`${s.t().config.imported} ${s.t().config.importedNoCalendar}`);
      dialogs.close(s.t().common.ok);
      await pending;

      await c.importConfig(fileEvent('x').event);
      c.passphrase.set('a long passphrase');
      pending = c.submitPassphrase();
      await untilDialog(dialogs);
      expect(dialogs.current()?.message).toBe(`${s.t().config.imported} ${s.t().config.importedCalendar}`);
      dialogs.close(s.t().common.ok);
      await pending;

      await c.importConfig(fileEvent(null).event);
      expect(c.passphraseMode()).toBeNull();

      const { event, input } = fileEvent('x');
      Object.defineProperty((input.files as FileList)[0], 'text', { value: () => Promise.reject(new Error('io')) });
      await c.importConfig(event);
      expect(c.passphraseMode()).toBeNull();
      expect(c.backupError()).toBe(s.t().config.unreadable);
    });
  });
});
