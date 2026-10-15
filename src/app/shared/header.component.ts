import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { DrawerService } from '../drawer.service';
import { UI_ICONS } from '../icons';
import { SettingsService } from '../settings.service';

/** Menu button, title and, on the transactions page, the filters button. */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly drawer = inject(DrawerService);
  readonly ui = UI_ICONS;
  readonly title = input.required<string>();
  /** `null` hides the filters button; otherwise whether a filter is active. */
  readonly filterActive = input<boolean | null>(null);
  readonly filtersTap = output<void>();
  /** `null` hides the synchronise button; otherwise whether a synchronisation is running. */
  readonly syncing = input<boolean | null>(null);
  readonly syncTap = output<void>();
  readonly syncLabel = computed(() => this.settings.t().calendar.syncNow);
  private readonly settings = inject(SettingsService);
}
