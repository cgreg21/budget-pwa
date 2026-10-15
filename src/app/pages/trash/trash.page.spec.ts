import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import type { Transaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { TrashPage } from './trash.page';

const DATA_KEY = 'budget-pwa:data:v1';
const TRASH_KEY = 'budget-pwa:trash:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

describe('TrashPage', () => {
  let b: BudgetService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    vi.stubGlobal('ResizeObserver', undefined);
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: { '2026-10': [tx(), tx({ id: 'two', description: 'Loyer' })] },
      categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }],
      recurrences: [],
      thresholds: { low: 0, medium: 100, high: 500 },
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    b = TestBed.inject(BudgetService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('moves a deleted transaction to the trash, and restores it', () => {
    b.selectMonth('2026-10');
    b.remove('one');
    expect(b.transactions().map((item) => item.id)).toEqual(['two']);
    expect(b.trash()).toEqual([expect.objectContaining({ id: 'one', deletedAt: expect.any(String) })]);
    expect(JSON.parse(localStorage.getItem(TRASH_KEY) ?? '[]')).toHaveLength(1);

    b.restore('one');
    expect(b.trash()).toEqual([]);
    expect(b.transactions().map((item) => item.id).sort()).toEqual(['one', 'two']);
  });

  it('notifies the synchronisation of trash changes, but not of calendar writes', () => {
    b.selectMonth('2026-10');
    b.remove('one');
    const changes = vi.fn();
    b.transactionChanges.subscribe(changes);
    b.applyCalendarTrash([{ ...tx({ id: 'x' }), deletedAt: '2026-10-01T00:00:00.000Z' }], []);
    expect(changes).not.toHaveBeenCalled();
    expect(b.trash().map((item) => item.id).sort()).toEqual(['one', 'x']);
    b.deleteForever('x');
    b.emptyTrash();
    expect(changes).toHaveBeenCalledTimes(2);
    expect(b.trash()).toEqual([]);
  });

  it('lists the trash, restores from it and empties it after confirmation', async () => {
    b.selectMonth('2026-10');
    b.remove('one');
    b.remove('two');
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TrashPage);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.row')).toHaveLength(2);

    (el.querySelector('button[aria-label="Restore"], button[aria-label="Restaurer"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(b.trash()).toHaveLength(1);

    await fixture.componentInstance.emptyTrash();
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalled();
    expect(b.trash()).toEqual([]);
    expect(el.querySelectorAll('.row')).toHaveLength(0);
  });
});
