import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';

/** Bar shown during a multi-selection: cancel, count, select all, then the page's own actions. */
@Component({
  selector: 'app-selection-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selection-bar.component.html',
})
export class SelectionBarComponent {
  readonly s = inject(SettingsService);
  readonly ui = UI_ICONS;
  readonly count = input.required<number>();
  readonly cancel = output<void>();
  readonly selectAll = output<void>();
}
