import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  areThresholdsOrdered, createArchive, parseBackupData, type AmountFormat, type AppLanguage, type Currency,
  type DateFormat, type Theme,
} from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { CalendarSyncService } from '../../calendar-sync.service';
import { DialogService } from '../../dialog.service';
import { InstallService } from '../../install.service';
import { parseAmount, SettingsService } from '../../settings.service';
import { HeaderComponent } from '../../shared/header.component';

const LANGUAGES: AppLanguage[] = ['fr', 'en'];
const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];
const DATE_FORMATS: DateFormat[] = ['locale', 'dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd'];
const AMOUNT_FORMATS: AmountFormat[] = ['locale', 'space-comma', 'comma-dot'];
const THEMES: Theme[] = ['system', 'light', 'dark'];

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [HeaderComponent],
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col animate-page' },
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  readonly b = inject(BudgetService);
  readonly s = inject(SettingsService);
  readonly calendar = inject(CalendarSyncService);
  readonly install = inject(InstallService);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);

  readonly low = signal(this.s.formatInput(this.b.thresholds().low));
  readonly medium = signal(this.s.formatInput(this.b.thresholds().medium));
  readonly high = signal(this.s.formatInput(this.b.thresholds().high));
  readonly message = signal('');
  readonly backupError = signal('');
  readonly calendarEnabled = signal(this.calendar.config().enabled);
  readonly calendarUrl = signal(this.calendar.config().calendarUrl);
  readonly calendarUser = signal(this.calendar.config().username);
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
    }, this.calendarPassword() === '' ? null : this.calendarPassword());
    if (!saved) return;
    this.calendarPassword.set('');
    const config = this.calendar.config();
    this.calendarEnabled.set(config.enabled);
    this.calendarUrl.set(config.calendarUrl);
    this.calendarUser.set(config.username);
    if (action === 'check') await this.calendar.checkConnection();
    else if (config.enabled) await this.calendar.syncNow();
  }

  async toggleCalendar(): Promise<void> {
    this.calendarEnabled.set(!this.calendarEnabled());
    await this.saveCalendar();
    this.calendarEnabled.set(this.calendar.active());
  }

  openRecurrences(): void {
    void this.router.navigateByUrl('/settings/recurrences');
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
    await this.dialogs.alert({ message: this.s.t().settings.thresholdsSaved, ok: this.s.t().common.ok });
  }

  exportBackup(): void {
    const archive = createArchive(this.b.data());
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-${this.b.selectedMonth()}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      if (ok) this.b.replaceData(imported);
      this.backupError.set('');
    } catch (error) {
      this.backupError.set(error instanceof Error ? error.message : String(error));
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
}
