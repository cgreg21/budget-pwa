import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { DrawerService } from '../drawer.service';
import { UI_ICONS } from '../icons';

/** Menu button, title and, on the transactions page, the filters button. */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-center bg-bg px-3 py-2 pt-[calc(8px+env(safe-area-inset-top))] md:px-5">
      <button type="button" class="flex size-11 items-center justify-center rounded-full bg-card text-[22px] text-ink font-mdi transition-transform active:scale-90 md:hidden"
              (click)="drawer.show()">{{ ui.menu }}</button>
      <h1 class="ml-3 flex-1 truncate text-[22px] font-bold md:ml-0">{{ title() }}</h1>
      @if (filterActive() !== null) {
        <button type="button"
                class="flex size-11 items-center justify-center rounded-full text-[22px] font-mdi transition-transform active:scale-90"
                [class]="filterActive() ? 'bg-brand text-on-brand' : 'bg-card text-ink'"
                (click)="filtersTap.emit()">{{ ui.filters }}</button>
      }
    </header>
  `,
})
export class HeaderComponent {
  readonly drawer = inject(DrawerService);
  readonly ui = UI_ICONS;
  readonly title = input.required<string>();
  /** `null` hides the filters button; otherwise whether a filter is active. */
  readonly filterActive = input<boolean | null>(null);
  readonly filtersTap = output<void>();
}
