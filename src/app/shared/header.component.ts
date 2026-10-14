import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { DrawerService } from '../drawer.service';
import { UI_ICONS } from '../icons';

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
}
