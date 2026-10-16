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
  templateUrl: './tab-bar.component.html',
})
export class TabBarComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly active = input.required<string>();
  readonly select = output<string>();
}
