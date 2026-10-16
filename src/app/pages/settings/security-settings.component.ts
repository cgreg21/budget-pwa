import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { DialogService } from '../../ui/dialog.service';
import { LockService } from '../../security/lock.service';
import { SettingsService } from '../../preferences/settings.service';
import { SnackbarService } from '../../ui/snackbar.service';

type Mode = 'none' | 'set' | 'change';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './security-settings.component.html',
})
export class SecuritySettingsComponent {
  readonly s = inject(SettingsService);
  readonly lock = inject(LockService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(DialogService);
  readonly mode = signal<Mode>('none');
  readonly current = signal('');
  readonly pin = signal('');
  readonly confirm = signal('');
  readonly error = signal('');

  open(mode: Mode): void {
    this.mode.set(mode);
    this.current.set('');
    this.pin.set('');
    this.confirm.set('');
    this.error.set('');
  }

  async submit(): Promise<void> {
    const t = this.s.t().lock;
    const mode = this.mode();
    if (mode !== 'set' && !(await this.lock.verify(this.current()))) {
      this.error.set(t.wrongPin);
      return;
    }
    if (!LockService.isValidPin(this.pin())) {
      this.error.set(t.pinInvalid);
      return;
    }
    if (this.pin() !== this.confirm()) {
      this.error.set(t.pinMismatch);
      return;
    }
    await this.lock.setPin(this.pin());
    this.snackbar.show(t.saved);
    this.open('none');
  }

  async disable(): Promise<void> {
    const t = this.s.t();
    const ok = await this.dialog.confirm({ title: t.lock.disable, message: t.lock.disableConfirm, ok: t.common.ok, cancel: t.common.cancel });
    if (!ok) return;
    this.lock.disable();
    this.snackbar.show(t.lock.disabled);
    this.open('none');
  }

  async toggleBiometric(): Promise<void> {
    if (this.lock.biometricEnabled()) {
      this.lock.disableBiometric();
      return;
    }
    if (!(await this.lock.enableBiometric())) this.snackbar.error(this.s.t().lock.biometricFailed);
  }

  digits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
