import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  areThresholdsOrdered, ConfigFileError, createArchive, isPassphraseAcceptable, parseBackupData, type AmountFormat,
  type AppLanguage, type Currency, type DateFormat, type Theme,
} from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { CalendarSyncService } from '../../calendar-sync.service';
import { ConfigArchiveService, downloadText } from '../../config-archive.service';
import { DialogService } from '../../dialog.service';
import { SnackbarService } from '../../snackbar.service';
import { InstallService } from '../../install.service';
import { glyph, UI_ICONS } from '../../icons';
import { OnboardingService } from '../../onboarding.service';
import { ProfileService } from '../../profile.service';
import { parseAmount, SettingsService } from '../../settings.service';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { SecuritySettingsComponent } from './security-settings.component';
import { HeaderComponent } from '../../shared/header.component';
import { SheetComponent } from '../../shared/sheet.component';

const LANGUAGES: AppLanguage[] = ['fr', 'en'];
const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];
const DATE_FORMATS: DateFormat[] = ['locale', 'dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd'];
const AMOUNT_FORMATS: AmountFormat[] = ['locale', 'space-comma', 'comma-dot'];
const THEMES: Theme[] = ['system', 'light', 'dark'];
const SETTINGS_TABS = ['general', 'budget', 'calendar', 'data'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
const TAB_ICONS: Record<SettingsTab, string> = {
  general: UI_ICONS.settings, budget: UI_ICONS.logo, calendar: UI_ICONS.calendar, data: glyph('folder'),
};

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [HeaderComponent, SecuritySettingsComponent, SheetComponent, AutofocusDirective],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly calendar = inject(CalendarSyncService);
  readonly install = inject(InstallService);
  readonly onboarding = inject(OnboardingService);
  readonly profiles = inject(ProfileService);
  private readonly configArchive = inject(ConfigArchiveService);
  private readonly dialogs = inject(DialogService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  readonly tab = signal<SettingsTab>('general');
  readonly tabs = computed(() => {
    const t = this.s.t().settings.tabs;
    return SETTINGS_TABS.map((id) => ({ id, label: t[id], icon: TAB_ICONS[id] }));
  });
  readonly low = signal(this.s.formatInput(this.b.thresholds().low));
  readonly medium = signal(this.s.formatInput(this.b.thresholds().medium));
  readonly high = signal(this.s.formatInput(this.b.thresholds().high));
  readonly message = signal('');
  readonly backupError = signal('');
  /** The passphrase sheet: exporting the configuration, or importing the file whose text is kept here. */
  readonly passphraseMode = signal<'export' | 'import' | null>(null);
  readonly passphrase = signal('');
  readonly passphraseConfirm = signal('');
  readonly passphraseError = signal('');
  readonly passphraseBusy = signal(false);
  private configText = '';
  readonly calendarEnabled = signal(this.calendar.config().enabled);
  readonly calendarUrl = signal(this.calendar.config().calendarUrl);
  readonly calendarUser = signal(this.calendar.config().username);
  readonly calendarProxy = signal(this.calendar.proxyUrl());
  readonly calendarInterval = signal(String(this.calendar.config().syncIntervalMinutes ?? 0));
  readonly calendarPassword = signal('');
  readonly calendarStatusText = computed(() => {
    const strings = this.s.t().calendar;
    const { state, lastSync } = this.calendar.status();
    let date = strings.never;
    if (lastSync) {
      const time = new Date(lastSync);
      const pad = (n: number): string => String(n).padStart(2, '0');
      const day = time.getFullYear() + '-' + pad(time.getMonth() + 1) + '-' + pad(time.getDate());
      date = this.s.formatDate(day) + ' ' + pad(time.getHours()) + ':' + pad(time.getMinutes());
    }
    return strings.states[state] + ' - ' + strings.lastSync(date);
  });

  async saveCalendar(action: 'save' | 'check' | 'sync' = 'save'): Promise<void> {
    const saved = this.calendar.configure({
      enabled: this.calendarEnabled(), calendarUrl: this.calendarUrl(), username: this.calendarUser(),
            syncIntervalMinutes: Number(this.calendarInterval()),
          }, this.calendarPassword() === '' ? null : this.calendarPassword(), this.calendarProxy());
    if (!saved) return;
    this.calendarPassword.set('');
    const config = this.calendar.config();
    this.calendarEnabled.set(config.enabled);
    this.calendarUrl.set(config.calendarUrl);
    this.calendarUser.set(config.username);
    this.calendarInterval.set(String(config.syncIntervalMinutes ?? 0));
    this.calendarProxy.set(this.calendar.proxyUrl());
    if (action === 'check') await this.calendar.checkConnection();
    else if (config.enabled) await this.calendar.syncNow(action === 'sync');
  }

  async toggleCalendar(): Promise<void> {
    this.calendarEnabled.set(!this.calendarEnabled());
    await this.saveCalendar();
    this.calendarEnabled.set(this.calendar.active());
  }

  openRecurrences(): void {
    void this.router.navigateByUrl('/settings/recurrences');
  }

  openProfiles(): void {
    void this.router.navigateByUrl('/settings/profiles');
  }

  profileName(): string {
    return this.profiles.active().name || this.s.t().profiles.defaultName;
  }

  languageName(language: AppLanguage): string {
    return language === 'fr' ? 'Fran\u00E7ais' : 'English';
  }

  dateFormatName(format: DateFormat): string {
    return format === 'locale' ? this.s.t().settings.formatLocale : format.toUpperCase();
  }

  amountFormatName(format: AmountFormat): string {
    const names: Record<AmountFormat, string> = {
      locale: this.s.t().settings.formatLocale, 'space-comma': '1 234,56', 'comma-dot': '1,234.56',
    };
    return names[format];
  }

  themeName(theme: Theme): string {
    const { themeSystem, themeLight, themeDark } = this.s.t().settings;
    return { system: themeSystem, light: themeLight, dark: themeDark }[theme];
  }

  pickLanguage(): Promise<void> {
    return this.choose(LANGUAGES, (v) => this.languageName(v), (language) => this.s.update({ language }));
  }

  pickCurrency(): Promise<void> {
    return this.choose(CURRENCIES, (v) => v, (currency) => this.s.update({ currency }));
  }

  pickDateFormat(): Promise<void> {
    return this.choose(DATE_FORMATS, (v) => this.dateFormatName(v), (dateFormat) => this.s.update({ dateFormat }));
  }

  pickAmountFormat(): Promise<void> {
    return this.choose(AMOUNT_FORMATS, (v) => this.amountFormatName(v), (amountFormat) => this.s.update({ amountFormat }));
  }

  pickTheme(): Promise<void> {
    return this.choose(THEMES, (v) => this.themeName(v), (theme) => this.s.update({ theme }));
  }

  async saveThresholds(): Promise<void> {
    const thresholds = {
      low: parseAmount(this.low()),
      medium: parseAmount(this.medium()),
      high: parseAmount(this.high()),
    };
    const valid = Object.values(thresholds).every(Number.isFinite) && areThresholdsOrdered(thresholds);
    if (!valid) {
      this.message.set(this.s.t().settings.thresholdsOrder);
      return;
    }
    this.message.set('');
    this.b.setThresholds(thresholds);
    this.snackbar.show(this.s.t().snackbar.thresholdsSaved);
  }

  exportBackup(): void {
    const archive = createArchive(this.b.data());
    downloadText(`budget-${this.b.selectedMonth()}.json`, JSON.stringify(archive, null, 2), 'application/json');
    this.snackbar.show(this.s.t().snackbar.backupExported);
  }

  async importBackup(event: Event): Promise<void> {
    const t = this.s.t();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const imported = parseBackupData(JSON.parse(await file.text()) as unknown);
      if (!imported) throw new Error(t.backup.invalid);
      const ok = await this.dialogs.confirm({
        title: t.backup.import, message: t.backup.confirm, ok: t.common.save, cancel: t.common.cancel,
      });
      if (ok) {
        this.b.replaceData(imported);
        this.snackbar.show(t.snackbar.backupImported);
      }
      this.backupError.set('');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.backupError.set(message);
      this.snackbar.error(message);
    } finally {
      input.value = '';
    }
  }

  private async choose<T extends string>(values: T[], label: (value: T) => string, apply: (value: T) => void): Promise<void> {
    const t = this.s.t();
    const labels = values.map(label);
    const picked = await this.dialogs.action({ title: t.settings.chooseOption, cancel: t.common.cancel, actions: labels });
    const index = picked === null ? -1 : labels.indexOf(picked);
    if (index >= 0) apply(values[index]);
  }

  exportConfig(): void {
    this.openPassphrase('export');
  }

  async importConfig(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.configText = await file.text();
      this.backupError.set('');
      this.openPassphrase('import');
    } catch {
      this.backupError.set(this.s.t().config.unreadable);
    } finally {
      input.value = '';
    }
  }

  closePassphrase(): void {
    if (this.passphraseBusy()) return;
    this.passphraseMode.set(null);
    this.passphrase.set('');
    this.passphraseConfirm.set('');
    this.passphraseError.set('');
    this.configText = '';
  }

  /** Runs the pending export or import with the typed passphrase; errors stay in the sheet. */
  async submitPassphrase(): Promise<void> {
    const mode = this.passphraseMode();
    const t = this.s.t().config;
    const passphrase = this.passphrase();
    if (mode === null || this.passphraseBusy()) return;
    if (!isPassphraseAcceptable(passphrase)) {
      this.passphraseError.set(t.errors['weak-passphrase']);
      return;
    }
    if (mode === 'export' && passphrase !== this.passphraseConfirm()) {
      this.passphraseError.set(t.passphraseMismatch);
      return;
    }
    this.passphraseBusy.set(true);
    try {
      if (mode === 'export') {
        await this.configArchive.exportEncrypted(passphrase);
        this.passphraseBusy.set(false);
        this.closePassphrase();
        this.snackbar.show(this.s.t().snackbar.configExported);
        return;
      }
      const summary = await this.configArchive.importEncrypted(this.configText, passphrase);
      this.passphraseBusy.set(false);
      this.closePassphrase();
      this.refreshFromServices();
      // The summary speaks the language that was just imported, like the rest of the screen.
      const imported = this.s.t().config;
      const lines = [imported.imported];
      if (summary.calendar) {
        lines.push(summary.calendarPassword ? imported.importedCalendarPassword : imported.importedCalendar);
      } else {
        lines.push(imported.importedNoCalendar);
      }
      if (summary.bankIgnored) lines.push(imported.bankIgnored);
      await this.dialogs.alert({ message: lines.join(' '), ok: this.s.t().common.ok });
    } catch (error) {
      this.passphraseBusy.set(false);
      this.passphraseError.set(error instanceof ConfigFileError
        ? t.errors[error.code] : error instanceof Error ? error.message : String(error));
    }
  }

  private openPassphrase(mode: 'export' | 'import'): void {
    this.passphrase.set('');
    this.passphraseConfirm.set('');
    this.passphraseError.set('');
    this.passphraseMode.set(mode);
  }

  /** Reflects an imported configuration in the form fields. */
  private refreshFromServices(): void {
    const thresholds = this.b.thresholds();
    this.low.set(this.s.formatInput(thresholds.low));
    this.medium.set(this.s.formatInput(thresholds.medium));
    this.high.set(this.s.formatInput(thresholds.high));
    const config = this.calendar.config();
    this.calendarEnabled.set(config.enabled);
    this.calendarUrl.set(config.calendarUrl);
    this.calendarUser.set(config.username);
    this.calendarInterval.set(String(config.syncIntervalMinutes ?? 0));
    this.calendarProxy.set(this.calendar.proxyUrl());
    this.calendarPassword.set('');
    this.message.set('');
  }
}
