import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal,
} from '@angular/core';
import { monthNumberOf, yearOf, type MonthKey } from 'budget-lib';

import type { MonthlyTotals } from '../budget.service';
import { SettingsService } from '../settings.service';

const INCOME_COLOR = '#00E5A0';
const EXPENSE_COLOR = '#FF6B6B';

/** Width used until the container has been measured, and the minimum the chart is drawn at. */
const MIN_WIDTH = 280;
const HEIGHT = 240;
const PLOT = { left: 44, right: 12, top: 12, bottom: 70 };

/** Months get at least this many pixels each before labels are tilted or skipped. */
const LABEL_WIDTH = 46;

const compactAmount = (value: number): string => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${Math.round(value)}`);

/** Three letters per month, four when two months would read the same (Juin / Juillet). */
const shortMonths = (names: string[]): string[] =>
  names.map((name) => {
    const short = name.slice(0, 3);
    return names.filter((other) => other.slice(0, 3) === short).length > 1 ? name.slice(0, 4) : short;
  });

/** Rounds a maximum up to a "nice" value so the axis ticks are round numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * A line chart with, for each month, the total income and the total expenses. It is drawn at the
 * container's width, one SVG unit per CSS pixel, so text keeps the application's font size.
 */
@Component({
  selector: 'app-monthly-lines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mx-3 my-1 block min-w-0' },
  templateUrl: './monthly-lines.component.html',
})
export class MonthlyLinesComponent {
  private readonly s = inject(SettingsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly rows = input.required<MonthlyTotals[]>();

  readonly width = signal(MIN_WIDTH);
  readonly height = HEIGHT;
  readonly plot = PLOT;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = (): void => {
        this.width.set(Math.max(MIN_WIDTH, Math.floor(this.host.nativeElement.clientWidth)));
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  readonly chart = computed(() => {
    const t = this.s.t();
    const rows = this.rows();
    const width = this.width();
    const months = shortMonths(t.months);
    const labelOf = (month: MonthKey): string => `${months[monthNumberOf(month) - 1]} ${String(yearOf(month)).slice(2)}`;

    const max = niceMax(Math.max(0, ...rows.flatMap((row) => [row.income, row.expense])));
    const innerWidth = width - PLOT.left - PLOT.right;
    const innerHeight = HEIGHT - PLOT.top - PLOT.bottom;
    const baseline = PLOT.top + innerHeight;
    // Half a unit of margin on each side keeps the first and last points off the edges.
    const xOf = (index: number): number => PLOT.left + ((index + 0.5) / Math.max(rows.length, 1)) * innerWidth;
    const yOf = (value: number): number => baseline - (value / max) * innerHeight;

    const lineOf = (values: number[], color: string): { color: string; points: string; dots: { x: number; y: number }[] } => {
      const dots = values.map((value, index) => ({ x: xOf(index), y: yOf(value) }));
      return { color, points: dots.map((dot) => `${dot.x},${dot.y}`).join(' '), dots };
    };

    // Labels are tilted once a month gets less room than a label needs, then thinned out when even that is not enough.
    const perMonth = innerWidth / Math.max(rows.length, 1);
    const tilt = perMonth < LABEL_WIDTH;
    const every = tilt ? Math.max(1, Math.ceil(LABEL_WIDTH / 2 / perMonth)) : 1;
    return {
      baseline,
      ticks: [0, 1, 2, 3, 4].map((step) => ({ value: (max * step) / 4, y: yOf((max * step) / 4), label: compactAmount((max * step) / 4) })),
      labels: rows
        .map((row, index) => ({ x: xOf(index), text: labelOf(row.month), tilt, index }))
        .filter((label) => label.index % every === 0),
      lines: [
        lineOf(rows.map((row) => row.income), INCOME_COLOR),
        lineOf(rows.map((row) => row.expense), EXPENSE_COLOR),
      ],
      legend: [
        { color: INCOME_COLOR, label: t.common.income },
        { color: EXPENSE_COLOR, label: t.common.expense },
      ],
    };
  });
}
