import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DEFAULT_CATEGORY_ICON } from 'budget-lib';

import { BudgetService } from '../../budget.service';
import { DialogService } from '../../dialog.service';
import { SettingsService } from '../../settings.service';
import { CategoriesPage } from './categories.page';

const DATA_KEY = 'budget-pwa:data:v1';

describe('CategoriesPage', () => {
  let b: BudgetService;
  let s: SettingsService;
  let dialogs: DialogService;

  const seed = (categories: { name: string; icon: string }[]): void => {
    localStorage.setItem(DATA_KEY, JSON.stringify({
      months: {}, categories, recurrences: [], thresholds: { low: 0, medium: 100, high: 500 },
    }));
  };

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: () => undefined })));
    seed([{ name: 'Alimentation', icon: 'folder-symbolic' }, { name: 'Logement', icon: 'home-symbolic' }]);
    b = TestBed.inject(BudgetService);
    s = TestBed.inject(SettingsService);
    dialogs = TestBed.inject(DialogService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const page = (): ComponentFixture<CategoriesPage> => {
    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    return fixture;
  };

  const names = (): string[] => b.categories().map((c) => c.name);

  it('adds a normalized category and resets the form', () => {
    const c = page().componentInstance;
    c.newName.set('  transport  ');
    c.newIcon.set('car-symbolic');
    c.add();
    expect(b.categories()[2]).toEqual({ name: 'transport', icon: 'car-symbolic' });
    expect(c.newName()).toBe('');
    expect(c.newIcon()).toBe(DEFAULT_CATEGORY_ICON);
    expect(c.error()).toBe('');
  });

  it('refuses an empty or duplicate name', () => {
    const c = page().componentInstance;
    c.newName.set('   ');
    c.add();
    expect(names()).toHaveLength(2);
    c.newName.set(' Logement ');
    c.add();
    expect(names()).toHaveLength(2);
    expect(c.error()).toBe(s.t().categories.exists('Logement'));
  });

  it('renames a category through the dialog', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    c.rename(b.categories()[1]);
    expect(c.renaming()?.name).toBe('Logement');
    expect(c.renameText()).toBe('Logement');
    fixture.detectChanges();
    c.renameText.set(' Maison ');
    c.confirmRename();
    expect(c.renaming()).toBeNull();
    expect(names()).toEqual(['Alimentation', 'Maison']);
  });

  it('keeps the dialog open on a taken name and cancels without change', () => {
    const c = page().componentInstance;
    c.rename(b.categories()[1]);
    c.renameText.set('Alimentation');
    c.confirmRename();
    expect(c.renaming()).not.toBeNull();
    expect(c.error()).toBe(s.t().categories.exists('Alimentation'));
    c.renameText.set('');
    c.confirmRename();
    expect(c.renaming()).not.toBeNull();
    c.cancelRename();
    expect(c.renaming()).toBeNull();
    expect(c.error()).toBe('');
    expect(names()).toEqual(['Alimentation', 'Logement']);
  });

  it('closes silently when the name is unchanged, and ignores confirm without a dialog', () => {
    const c = page().componentInstance;
    c.confirmRename();
    c.rename(b.categories()[0]);
    c.renameText.set(' Alimentation ');
    c.confirmRename();
    expect(c.renaming()).toBeNull();
    expect(names()).toEqual(['Alimentation', 'Logement']);
  });

  it('picks an icon for the new category or an existing one', () => {
    const fixture = page();
    const c = fixture.componentInstance;
    expect(c.currentIcon()).toBe('');
    c.pickerTarget.set(c.NEW);
    expect(c.currentIcon()).toBe(DEFAULT_CATEGORY_ICON);
    fixture.detectChanges();
    c.pickIcon('car-symbolic');
    expect(c.pickerTarget()).toBeNull();
    expect(c.newIcon()).toBe('car-symbolic');

    c.pickerTarget.set('Logement');
    expect(c.currentIcon()).toBe('home-symbolic');
    c.pickIcon('car-symbolic');
    expect(b.categories()[1].icon).toBe('car-symbolic');

    c.pickIcon('x');
    expect(b.categories().map((item) => item.icon)).toEqual(['folder-symbolic', 'car-symbolic']);
  });

  it('removes a category after confirmation', async () => {
    const c = page().componentInstance;
    let pending = c.remove(b.categories()[1]);
    expect(dialogs.current()).toMatchObject({ message: s.t().categories.deleteBody('Logement') });
    dialogs.close(null);
    await pending;
    expect(names()).toHaveLength(2);
    pending = c.remove(b.categories()[1]);
    dialogs.close(s.t().common.delete);
    await pending;
    expect(names()).toEqual(['Alimentation']);
  });

  it('moves a removed category to the trash, restores it or deletes it for good', () => {
    b.removeCategory('Logement');
    expect(b.trashedCategories().map((c) => c.name)).toEqual(['Logement']);
    expect(JSON.parse(localStorage.getItem('budget-pwa:trash-categories:v1') ?? '[]')).toHaveLength(1);

    b.restoreCategory('Logement');
    expect(names()).toEqual(['Alimentation', 'Logement']);
    expect(b.categories()[1].icon).toBe('home-symbolic');
    expect(b.trashedCategories()).toEqual([]);

    b.removeCategory('Logement');
    b.addCategory('Logement', 'folder-symbolic');
    b.restoreCategory('Logement');
    expect(names().filter((name) => name === 'Logement')).toHaveLength(1);
    expect(b.trashedCategories()).toEqual([]);

    b.removeCategory('Logement');
    b.deleteCategoryForever('Logement');
    expect(b.trashedCategories()).toEqual([]);
    expect(names()).toEqual(['Alimentation']);
  });

  it('empties the trashed categories with the trash', () => {
    b.removeCategory('Logement');
    b.emptyTrash();
    expect(b.trashedCategories()).toEqual([]);
  });

  it('refuses to remove the last category', async () => {
    seed([{ name: 'Seule', icon: 'folder-symbolic' }]);
    TestBed.resetTestingModule();
    b = TestBed.inject(BudgetService);
    dialogs = TestBed.inject(DialogService);
    const c = page().componentInstance;
    const pending = c.remove(b.categories()[0]);
    expect(dialogs.current()).toMatchObject({ message: s.t().categories.mustKeepOne });
    dialogs.close(s.t().common.ok);
    await pending;
    expect(names()).toEqual(['Seule']);
  });
});
