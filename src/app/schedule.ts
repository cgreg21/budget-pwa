import { LAST_MONTH, monthKeyOf, occurrencesIn, shiftMonth, type MonthKey, type Recurrence } from 'budget-lib';

/** One date a recurrence falls on. */
export interface ScheduledOccurrence {
  date: string;
  amount: number;
  recurrence: Recurrence;
}

/** A month of the schedule, with what it brings in and takes out. */
export interface ScheduleMonth {
  month: MonthKey;
  items: ScheduledOccurrence[];
  income: number;
  expense: number;
}

/**
 * The dates the recurrences fall on from `from` (an ISO date, included) over `months` months, the month of
 * `from` being the first. Chronological; ties are ordered by description.
 */
export function scheduleOccurrences(recurrences: readonly Recurrence[], from: string, months: number): ScheduledOccurrence[] {
  const scheduled: ScheduledOccurrence[] = [];
  const first = monthKeyOf(from);
  for (let step = 0; step < months; step++) {
    const month = shiftMonth(first, step);
    for (const recurrence of recurrences) {
      for (const { date, amount } of occurrencesIn(recurrence, month)) {
        if (date >= from) scheduled.push({ date, amount, recurrence });
      }
    }
    if (month === LAST_MONTH) break;
  }
  return scheduled.sort(
    (a, b) => a.date.localeCompare(b.date) || a.recurrence.description.localeCompare(b.recurrence.description),
  );
}

/** The occurrences grouped by month, in order, with the totals of each. */
export function groupByMonth(occurrences: readonly ScheduledOccurrence[]): ScheduleMonth[] {
  const groups: ScheduleMonth[] = [];
  for (const occurrence of occurrences) {
    const month = monthKeyOf(occurrence.date);
    let group = groups[groups.length - 1];
    if (group?.month !== month) {
      group = { month, items: [], income: 0, expense: 0 };
      groups.push(group);
    }
    group.items.push(occurrence);
    if (occurrence.recurrence.kind === 'income') group.income += occurrence.amount;
    else group.expense += occurrence.amount;
  }
  return groups;
}
