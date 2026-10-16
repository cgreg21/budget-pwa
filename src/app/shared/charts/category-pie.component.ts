import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { PieSlice } from 'budget-lib';

import { SettingsService } from '../../preferences/settings.service';

/** Slices thinner than this get no percentage written on them. */
const MIN_LABELLED_FRACTION = 0.06;
const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER = 100;
const INNER = OUTER * 0.58;

const formatPercent = (fraction: number): string => (fraction < 0.01 ? '<1%' : `${Math.round(fraction * 100)}%`);

function point(radius: number, angle: number): string {
  return `${(CENTER + radius * Math.sin(angle)).toFixed(2)} ${(CENTER - radius * Math.cos(angle)).toFixed(2)}`;
}

/** The path of a donut slice between two angles (radians, clockwise from the top). */
function arc(from: number, to: number): string {
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${point(OUTER, from)} A ${OUTER} ${OUTER} 0 ${large} 1 ${point(OUTER, to)} `
    + `L ${point(INNER, to)} A ${INNER} ${INNER} 0 ${large} 0 ${point(INNER, from)} Z`;
}

/** A donut chart of amounts per category, with its legend (color, name, amount, share). */
@Component({
  selector: 'app-category-pie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-pie.component.html',
})
export class CategoryPieComponent {
  readonly s = inject(SettingsService);
  readonly slices = input.required<PieSlice[]>();
  readonly kind = input<'income' | 'expense'>('expense');
  readonly title = input('');

  readonly size = SIZE;
  readonly center = CENTER;
  readonly outer = OUTER;
  readonly inner = INNER;

  readonly parts = computed(() => {
    let angle = 0;
    return this.slices().map((slice) => {
      const from = angle;
      angle += slice.fraction * Math.PI * 2;
      const middle = (from + angle) / 2;
      const [labelX, labelY] = point((OUTER + INNER) / 2, middle).split(' ');
      return {
        label: slice.label,
        color: slice.color,
        full: slice.fraction >= 0.9999,
        path: arc(from, Math.min(angle, from + Math.PI * 2 - 0.0001)),
        percent: slice.fraction >= MIN_LABELLED_FRACTION ? formatPercent(slice.fraction) : '',
        labelX,
        labelY,
      };
    });
  });

  readonly legend = computed(() => this.slices().map((slice) => ({
    label: slice.label,
    icon: slice.icon ?? '',
    color: slice.color,
    amount: this.s.formatAmount(slice.amount),
    percent: formatPercent(slice.fraction),
    width: slice.fraction * 100,
  })));
}
