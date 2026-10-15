import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { LockService } from '../../lock.service';
import { SettingsService } from '../../settings.service';
import { SnackbarService } from '../../snackbar.service';

type Mode = 'none' | 'set' | 'change' | 'disable';

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
    if (mode === 'disable') {
      this.lock.disable();
      this.snackbar.show(t.disabled);
      this.open('none');
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
