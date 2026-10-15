import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';
import { SnackbarService } from '../snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snackbar.component.html',
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
  readonly s = inject(SettingsService);
  readonly closeIcon = UI_ICONS.close;
}
