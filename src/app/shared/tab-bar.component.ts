import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TabItem {
  key: string;
  icon: string;
  badge?: number;
}

/** Bottom tab bar: icons with an optional count badge; the active tab has a green top edge. */
@Component({
  selector: 'app-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="grid h-[72px] grid-cols-2 border-t border-line bg-surface">
      @for (tab of tabs(); track tab.key) {
        <button type="button"
                class="flex items-center justify-center border-t-[3px] py-1 transition-transform active:scale-95"
                [class]="tab.key === active() ? 'border-brand' : 'border-transparent'"
                (click)="select.emit(tab.key)">
          <span class="relative px-3.5">
            <span class="block text-center text-[32px] font-mdi" [class]="tab.key === active() ? 'text-green' : 'text-muted'">{{ tab.icon }}</span>
            @if (tab.badge !== undefined) {
              <span class="absolute -right-1 -top-1 box-border h-[18px] min-w-[18px] rounded-full border px-[5px] text-center text-[11px] font-bold leading-4"
                    [class]="tab.key === active() ? 'border-brand bg-brand text-on-brand' : 'border-line bg-card text-muted'">{{ tab.badge }}</span>
            }
          </span>
        </button>
      }
    </nav>
  `,
})
export class TabBarComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly active = input.required<string>();
  readonly select = output<string>();
}
