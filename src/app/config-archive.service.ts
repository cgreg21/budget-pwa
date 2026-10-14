import { Injectable, inject } from '@angular/core';
import {
  CONFIG_FILE_EXTENSION, describeConfig, openConfig, sealConfig, webCryptoConfigCipher, type ConfigData,
  type WebCryptoLike,
} from 'budget-lib';

import { BudgetService } from './budget.service';
import { CalendarSyncService } from './calendar-sync.service';
import { SettingsService } from './settings.service';

/** Which sections of an imported configuration were found, and the one the PWA cannot use. */
export interface ConfigImportSummary {
  calendar: boolean;
  calendarPassword: boolean;
  /** The file carried a bank configuration; the PWA has no bank import and left it aside. */
  bankIgnored: boolean;
}

/** Offers a text as a file download, the way the JSON backup is exported. */
export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports and imports the settings of this device as an encrypted file (`budget-lib`'s config
 * archive): general preferences, thresholds, calendar access with its password and the CORS proxy.
 */
@Injectable({ providedIn: 'root' })
export class ConfigArchiveService {
  private readonly budget = inject(BudgetService);
  private readonly settings = inject(SettingsService);
  private readonly calendar = inject(CalendarSyncService);
  // The DOM typings distinguish ArrayBuffer-backed views, the library's structural type does not; the runtime API is the same.
  private readonly cipher = webCryptoConfigCipher(crypto as unknown as WebCryptoLike);

  /** Everything configured on this device; the PWA has no bank import, so `bank` is always null. */
  async collect(): Promise<ConfigData> {
    return {
      general: { ...this.settings.settings() },
      thresholds: { ...this.budget.thresholds() },
      calendar: {
        ...this.calendar.config(), proxyUrl: this.calendar.proxyUrl(), password: await this.calendar.readPassword(),
      },
      bank: null,
    };
  }

  /** Encrypts the configuration with the passphrase and downloads it; `ConfigFileError('weak-passphrase')` when too short. */
  async exportEncrypted(passphrase: string, now = new Date()): Promise<void> {
    const text = await sealConfig(await this.collect(), passphrase, this.cipher, { exportedAt: now.toISOString() });
    const pad = (n: number): string => String(n).padStart(2, '0');
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    downloadText(`budget-config-${day}${CONFIG_FILE_EXTENSION}`, text, 'application/json');
  }

  /**
   * Opens the file and applies what it holds. An empty calendar password keeps the one already
   * saved; the bank section is ignored. `ConfigFileError` tells why the file could not be opened.
   */
  async importEncrypted(text: string, passphrase: string): Promise<ConfigImportSummary> {
    const data = await openConfig(text, passphrase, this.cipher);
    this.settings.update(data.general);
    this.budget.setThresholds(data.thresholds);
    const { proxyUrl, password, ...config } = data.calendar;
    const secret = password === '' ? null : password;
    if (!this.calendar.configure(config, secret, proxyUrl)) {
      this.calendar.configure({ ...config, enabled: false }, secret, proxyUrl);
    }
    const found = describeConfig(data);
    return { calendar: found.calendar, calendarPassword: found.calendarPassword, bankIgnored: found.bank };
  }
}
