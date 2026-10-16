import type { Recurrence } from 'budget-lib';

import { groupByMonth, scheduleOccurrences } from './schedule';

function recurrence(patch: Partial<Recurrence>): Recurrence {
  return {
    id: 'r', description: 'Loyer', amount: 100, kind: 'expense', category: 'Logement', day: 5, startMonth: '2026-01',
    frequency: 'monthly', ...patch,
  } as Recurrence;
}

describe('scheduleOccurrences', () => {
  it('lists the upcoming dates of every recurrence in chronological order', () => {
    const rent = recurrence({ id: 'rent', description: 'Loyer' });
    const gym = recurrence({ id: 'gym', description: 'Gym', frequency: 'weekly', day: 7, startMonth: '2026-10' });
    const scheduled = scheduleOccurrences([rent, gym], '2026-10-10', 2);
    expect(scheduled.map((s) => `${s.date} ${s.recurrence.id}`)).toEqual([
      '2026-10-14 gym', '2026-10-21 gym', '2026-10-28 gym',
      '2026-11-04 gym', '2026-11-05 rent', '2026-11-11 gym', '2026-11-18 gym', '2026-11-25 gym',
    ]);
  });

  it('keeps today and drops earlier dates, and stops with a limited series', () => {
    const limited = recurrence({ occurrences: 10 });
    expect(scheduleOccurrences([limited], '2026-10-05', 12).map((s) => s.date)).toEqual(['2026-10-05']);
    expect(scheduleOccurrences([limited], '2026-10-06', 12)).toEqual([]);
  });

  it('does not run past the last navigable month', () => {
    expect(scheduleOccurrences([recurrence({})], '2099-11-01', 6).map((s) => s.date)).toEqual(['2099-11-05', '2099-12-05']);
  });
});

describe('groupByMonth', () => {
  it('groups by month with income and expense totals', () => {
    const rent = recurrence({ amount: 700 });
    const salary = recurrence({ id: 'salary', description: 'Salaire', kind: 'income', amount: 2000, day: 28 });
    const months = groupByMonth(scheduleOccurrences([rent, salary], '2026-10-01', 2));
    expect(months.map((m) => [m.month, m.items.length, m.income, m.expense])).toEqual([
      ['2026-10', 2, 2000, 700], ['2026-11', 2, 2000, 700],
    ]);
  });
});
