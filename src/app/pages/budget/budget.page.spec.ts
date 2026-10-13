import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NO_FILTER, type Transaction } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { UI_ICONS } from '../../icons';
import { LayoutService } from '../../layout.service';
import { SettingsService } from '../../settings.service';
import { BudgetPage } from './budget.page';
import { EditorModalComponent } from './editor-modal.component';
import { FiltersModalComponent } from './filters-modal.component';

const DATA_KEY = 'budget-pwa:data:v1';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 'one', date: '2026-10-05', description: 'Courses', category: 'Alimentation', kind: 'expense', amount: 50, ...over,
});

const seed = (months: Record<string, Transaction[]>, recurrences: object[] = []): void => {
  localStorage.setItem(DATA_KEY, JSON.stringify({
    months,
    categories: [{ name: 'Alimentation', icon: 'folder-symbolic' }, { name: 'Logement', icon: 'home-symbolic' }],
    recurrences,
    thresholds: { low: 10, medium: 100, high: 500 },
  }));
};

const RENT = {
  id: 'r1', description: 'Loyer', category: 'Logement', kind: 'expense', amount: 700, day: 3, frequency: 'monthly', startMonth: '2026-09',
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('BudgetPage', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    seed({
      '2026-10': [
        tx(), tx({ id: 'pay', kind: 'income', amount: 1500, description: 'Salaire', date: '2026-10-01' }),
        tx({ id: 'rent', description: 'Loyer', category: 'Logement', amount: 700, recurrenceId: 'r1', date: '2026-10-03' }),
      ],
    }, [RENT]);
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const page = (): ComponentFixture<BudgetPage> => {
    const fixture = TestBed.createComponent(BudgetPage);
    fixture.detectChanges();
    return fixture;
  };

  it('derives the level, counts, tabs and panels from the month', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    expect(c.level()).toBe('high');
    expect(c.levelCard()).toContain('lvl-high');
    expect(c.levelText()).toBe('text-green');
    expect(c.recurringCount()).toBe(1);
    expect(c.oneOffCount()).toBe(2);
    expect(c.tabs()).toEqual([
      { key: 'oneoff', icon: UI_ICONS.transactions, badge: 2 }, { key: 'recurring', icon: UI_ICONS.repeat, badge: 1 },
    ]);
    const panels = c.panels();
    expect(panels.map((p) => p.items.map((t) => t.id))).toEqual([['one', 'pay'], ['rent']]);
    expect(panels.map((p) => p.title)).toEqual([s.t().budget.oneOff, s.t().budget.recurring]);
    expect(panels.map((p) => p.count)).toEqual([2, 1]);
    expect(panels.map((p) => p.message)).toEqual([s.t().budget.noMatch, s.t().budget.noMatch]);
    expect(fixture.nativeElement.querySelectorAll('app-swipe-row')).toHaveLength(3);
  });

  it('turns critical on a month without transactions and shows the empty messages', () => {
    b.selectMonth('2026-05');
    const fixture = page();
    const c = fixture.componentInstance;
    expect(c.level()).toBe('critical');
    expect(c.levelText()).toBe('text-bad');
    expect(c.panels().map((p) => p.message)).toEqual([s.t().budget.emptyOneOff, s.t().budget.emptyRecurring]);
  });

  it('reports no match when the filters hide everything', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.applyFilters({ ...NO_FILTER, search: 'zzz' });
    expect(c.hasFilters()).toBe(true);
    expect(c.filtersOpen()).toBe(false);
    expect(c.panels().map((p) => p.items.length)).toEqual([0, 0]);
    expect(c.panels().map((p) => p.message)).toEqual([s.t().budget.noMatch, s.t().budget.noMatch]);
  });

  it('switches tab and closes the open row', () => {
    const c = page().componentInstance;
    c.setOpenRow('one', true);
    c.selectTab('recurring');
    expect(c.tab()).toBe('recurring');
    expect(c.openRow()).toBeNull();
  });

  it('chooses a month from the picker', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.monthPickerOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-month-picker')).not.toBeNull();
    c.chooseMonth('2026-08');
    expect(c.monthPickerOpen()).toBe(false);
    expect(b.selectedMonth()).toBe('2026-08');
  });

  it('opens the editor on tap, or only closes a swiped row', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.setOpenRow('pay', true);
    c.edit(tx());
    expect(c.openRow()).toBeNull();
    expect(c.editing()).toBeNull();
    c.edit(tx());
    expect(c.editing()).toBe('one');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-editor-modal')).not.toBeNull();
  });

  it('tracks the swiped row', () => {
    const c = page().componentInstance;
    c.setOpenRow('one', true);
    expect(c.openRow()).toBe('one');
    c.setOpenRow('pay', false);
    expect(c.openRow()).toBe('one');
    c.setOpenRow('one', false);
    expect(c.openRow()).toBeNull();
  });

  it('deletes from a swipe after confirmation', async () => {
    const c = page().componentInstance;
    c.setOpenRow('one', true);
    const pending = c.deleteFromSwipe(tx());
    expect(c.openRow()).toBeNull();
    dialogs.close(s.t().common.delete);
    await pending;
    expect(b.transactions().map((t) => t.id)).toEqual(['pay', 'rent']);
  });

  it('formats subtitles and glyphs', () => {
    const c = page().componentInstance;
    expect(c.subtitle(tx())).toBe('05 \u00B7 Alimentation');
    expect(c.subtitle(tx({ recurrenceId: 'r1', date: '2026-10-03' }))).toBe(`03 \u00B7 Alimentation \u00B7 \u21BB ${s.t().budget.recurringBadge}`);
    expect(c.glyphOfCategory('Logement')).not.toBe('');
  });

  it('opens the filters modal', () => {
    const fixture = page();
    fixture.componentInstance.filtersOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-filters-modal')).not.toBeNull();
  });

  it('renders the wide layout too', () => {
    TestBed.inject(LayoutService).wide.set(true);
    const fixture = page();
    expect(fixture.nativeElement.querySelectorAll('app-swipe-row').length).toBeGreaterThan(0);
  });
});

describe('EditorModalComponent', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-10-13T10:00:00'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    seed({
      '2026-10': [tx(), tx({ id: 'rent', description: 'Loyer', category: 'Logement', amount: 700, recurrenceId: 'r1', date: '2026-10-03' })],
      '2026-09': [tx({ id: 'rent0', description: 'Loyer', category: 'Logement', amount: 700, recurrenceId: 'r1', date: '2026-09-03' })],
    }, [RENT]);
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const editor = (id: string | null): { fixture: ComponentFixture<EditorModalComponent>; c: EditorModalComponent; closed: ReturnType<typeof vi.fn> } => {
    const fixture = TestBed.createComponent(EditorModalComponent);
    fixture.componentRef.setInput('id', id);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, closed };
  };

  it('starts empty for a new transaction', () => {
    const { c } = editor(null);
    expect(c.existing).toBeUndefined();
    expect(c.kind()).toBe('expense');
    expect(c.amount()).toBe('');
    expect(c.category()).toBe('Alimentation');
    expect(c.repeat()).toBe(false);
    expect(c.occurrences()).toBe('12');
    expect(c.categoryGlyph()).not.toBe('');
  });

  it('loads an existing occurrence with its series', () => {
    const { c } = editor('rent');
    expect(c.existing?.id).toBe('rent');
    expect(c.amount()).toBe('700,00');
    expect(c.description()).toBe('Loyer');
    expect(c.category()).toBe('Logement');
    expect(c.repeat()).toBe(true);
    expect(c.frequency()).toBe('monthly');
    expect(c.limited()).toBe(false);
  });

  it('loads a limited series', () => {
    seed({ '2026-10': [tx({ id: 'rent', recurrenceId: 'r1' })] }, [{ ...RENT, occurrences: 6 }]);
    TestBed.resetTestingModule();
    const { c } = editor('rent');
    expect(c.limited()).toBe(true);
    expect(c.occurrences()).toBe('6');
  });

  it('rejects an invalid amount', async () => {
    const { c, closed } = editor(null);
    c.amount.set('abc');
    await c.save();
    expect(c.error()).toBe(s.t().editor.invalidAmount);
    c.amount.set('-3');
    await c.save();
    expect(c.error()).toBe(s.t().editor.invalidAmount);
    expect(closed).not.toHaveBeenCalled();
    expect(b.transactions()).toHaveLength(2);
  });

  it('adds a one-off transaction', async () => {
    const { c, closed } = editor(null);
    c.amount.set('12,5');
    c.description.set('  Pain ');
    c.kind.set('income');
    await c.save();
    expect(c.error()).toBe('');
    expect(closed).toHaveBeenCalledTimes(1);
    const added = b.transactions().find((t) => t.description === 'Pain');
    expect(added).toMatchObject({ amount: 12.5, kind: 'income', category: 'Alimentation', date: '2026-10-13' });
  });

  it('adds a limited recurring transaction with bounded occurrences', async () => {
    const { c } = editor(null);
    c.amount.set('20');
    c.repeat.set(true);
    c.limited.set(true);
    c.occurrences.set('9999');
    await c.save();
    const series = b.recurrences().find((r) => r.amount === 20);
    expect(series?.occurrences).toBeDefined();
    expect(series!.occurrences!).toBeLessThan(9999);
  });

  it('falls back to the minimum when the occurrences are not a number', async () => {
    const { c } = editor(null);
    c.amount.set('20');
    c.repeat.set(true);
    c.limited.set(true);
    c.occurrences.set('abc');
    await c.save();
    const series = b.recurrences().find((r) => r.amount === 20);
    expect(series?.occurrences).toBeGreaterThanOrEqual(1);
  });

  it('adds an unlimited recurring transaction', async () => {
    const { c } = editor(null);
    c.amount.set('20');
    c.repeat.set(true);
    c.frequency.set('quarterly');
    await c.save();
    const series = b.recurrences().find((r) => r.amount === 20);
    expect(series).toMatchObject({ frequency: 'quarterly' });
    expect(series?.occurrences).toBeUndefined();
  });

  it('updates a one-off transaction', async () => {
    const { c, closed } = editor('one');
    c.amount.set('60');
    await c.save();
    expect(b.transactions().find((t) => t.id === 'one')?.amount).toBe(60);
    expect(closed).toHaveBeenCalled();
  });

  it('turns a one-off transaction into a series', async () => {
    const { c } = editor('one');
    c.repeat.set(true);
    await c.save();
    expect(b.recurrences()).toHaveLength(2);
    expect(b.transactions().find((t) => t.id === 'one')?.recurrenceId).toBeDefined();
  });

  it('asks the scope when editing an occurrence and updates only it', async () => {
    const { c, closed } = editor('rent');
    c.amount.set('750');
    const pending = c.save();
    await flush();
    expect(dialogs.current()).toMatchObject({ title: s.t().editor.scopeTitle, actions: [s.t().editor.occurrenceOnly, s.t().editor.seriesToo] });
    dialogs.close(s.t().editor.occurrenceOnly);
    await pending;
    expect(b.transactions().find((t) => t.id === 'rent')?.amount).toBe(750);
    expect(b.recurrences()[0].amount).toBe(700);
    expect(closed).toHaveBeenCalled();
  });

  it('updates the whole series when asked', async () => {
    const { c } = editor('rent');
    c.amount.set('750');
    const pending = c.save();
    await flush();
    dialogs.close(s.t().editor.seriesToo);
    await pending;
    expect(b.recurrences()[0].amount).toBe(750);
    expect(b.transactions().find((t) => t.id === 'rent')?.amount).toBe(750);
    expect(b.transactionsOf('2026-09')[0].amount).toBe(700);
  });

  it('also offers to turn a one-off transaction into an unlimited series, and drops the series of an occurrence', async () => {
    const { c } = editor('rent');
    c.repeat.set(false);
    const pending = c.save();
    await flush();
    dialogs.close(s.t().editor.seriesToo);
    await pending;
    expect(b.recurrences()).toEqual([]);
    expect(b.transactions().find((t) => t.id === 'rent')?.recurrenceId).toBeUndefined();
  });

  it('keeps everything when the scope choice is cancelled', async () => {
    const { c, closed } = editor('rent');
    c.amount.set('750');
    const pending = c.save();
    await flush();
    dialogs.close(null);
    await pending;
    expect(b.transactions().find((t) => t.id === 'rent')?.amount).toBe(700);
    expect(closed).not.toHaveBeenCalled();
  });

  it('picks a category and a frequency through the action dialog', async () => {
    const { c } = editor(null);
    let pending = c.pickCategory();
    expect(dialogs.current()?.actions).toEqual(['Alimentation', 'Logement']);
    dialogs.close('Logement');
    await pending;
    expect(c.category()).toBe('Logement');
    pending = c.pickCategory();
    dialogs.close(null);
    await pending;
    expect(c.category()).toBe('Logement');

    pending = c.pickFrequency();
    expect(dialogs.current()?.actions).toContain(s.t().frequency.quarterly);
    dialogs.close(s.t().frequency.quarterly);
    await pending;
    expect(c.frequency()).toBe('quarterly');
    pending = c.pickFrequency();
    dialogs.close(null);
    await pending;
    expect(c.frequency()).toBe('quarterly');
  });

  it('removes the transaction and closes, or stays when nothing to remove', async () => {
    const { c, closed } = editor('one');
    const pending = c.remove();
    dialogs.close(s.t().common.delete);
    await pending;
    expect(closed).toHaveBeenCalled();
    expect(b.transactions().map((t) => t.id)).toEqual(['rent']);

    const fresh = editor(null);
    await fresh.c.remove();
    expect(fresh.closed).not.toHaveBeenCalled();
  });

  it('normalizes the amount input', () => {
    const { c } = editor(null);
    c.amount.set('1234.5');
    c.normalizeAmount();
    expect(c.amount()).toBe(s.normalizeInput('1234.5'));
  });
});

describe('FiltersModalComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    seed({});
  });

  afterEach(() => vi.unstubAllGlobals());

  const filters = (): ComponentFixture<FiltersModalComponent> => {
    const fixture = TestBed.createComponent(FiltersModalComponent);
    fixture.componentRef.setInput('filter', { ...NO_FILTER, categories: ['Logement'] });
    fixture.detectChanges();
    return fixture;
  };

  it('starts from the given filter and lists the categories', () => {
    const fixture = filters();
    const c = fixture.componentInstance;
    const s = TestBed.inject(SettingsService);
    expect(c.hasFilters()).toBe(true);
    expect(c.rows().map((r) => [r.name, r.selected])).toEqual([['Alimentation', false], ['Logement', true]]);
    expect(c.categoriesTitle()).toBe(`${s.t().budget.categoryFilter} (1)`);
    expect(fixture.nativeElement.querySelectorAll('.pick-row')).toHaveLength(2);
  });

  it('patches, toggles and resets', () => {
    const fixture = filters();
    const c = fixture.componentInstance;
    const s = TestBed.inject(SettingsService);
    c.patch({ kind: 'income', search: 'a' });
    expect(c.filter()).toMatchObject({ kind: 'income', search: 'a' });
    c.toggle('Logement');
    c.toggle('Alimentation');
    expect(c.filter().categories).toEqual(['Alimentation']);
    c.reset();
    expect(c.filter()).toEqual(NO_FILTER);
    expect(c.hasFilters()).toBe(false);
    expect(c.categoriesTitle()).toBe(s.t().budget.categoryFilter);
  });

  it('emits through the buttons', () => {
    const fixture = filters();
    const done = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    fixture.componentInstance.closed.subscribe(closed);
    const input = fixture.nativeElement.querySelector('input.search') as HTMLInputElement;
    input.value = 'cour';
    input.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelectorAll('.chip')[2] as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.pick-row') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement).click();
    expect(done).toHaveBeenCalledWith({ search: 'cour', kind: 'expense', categories: ['Logement', 'Alimentation'] });
    (fixture.nativeElement.querySelector('button.secondary') as HTMLButtonElement).click();
    expect(fixture.componentInstance.filter()).toEqual(NO_FILTER);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button.secondary') as HTMLButtonElement).disabled).toBe(true);
  });
});
