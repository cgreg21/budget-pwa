import { TestBed } from '@angular/core/testing';

import { parseAmount, SettingsService } from './settings.service';

describe('parseAmount', () => {
  it.each([
    ['12', 12], ['12,5', 12.5], ['12.5', 12.5], ['1 234,56', 1234.56], ['1\u00A0234,56', 1234.56],
    ['1,234.56', 1234.56], ['1.234,56', 1234.56], ['-3,10', -3.1], ['', 0], ['abc', NaN],
  ])('parses %j as %d', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });
});

describe('SettingsService', () => {
  let matches = false;
  let listener: (() => void) | undefined;

  beforeEach(() => {
    matches = false;
    listener = undefined;
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      get matches() { return matches; },
      addEventListener: (_: string, fn: () => void) => { listener = fn; },
    })));
    document.head.innerHTML = '<meta name="theme-color" content="">';
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.unstubAllGlobals());

  const service = () => TestBed.inject(SettingsService);

  it('starts dark and in French, applying the theme to the document', () => {
    const s = service();
    expect(s.settings().language).toBe('fr');
    expect(s.settings().theme).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0f1e');
  });

  it('restores saved settings and ignores corrupted ones', () => {
    localStorage.setItem('budget-pwa:settings:v1', JSON.stringify({ language: 'en', theme: 'light', currency: 'USD', dateFormat: 'locale', amountFormat: 'locale' }));
    expect(service().settings().currency).toBe('USD');
    TestBed.resetTestingModule();
    localStorage.setItem('budget-pwa:settings:v1', '{"language":"klingon"}');
    expect(service().settings().language).toBe('fr');
  });

  it('persists updates and reapplies theme and language', () => {
    const s = service();
    s.update({ theme: 'light', language: 'en' });
    expect(JSON.parse(localStorage.getItem('budget-pwa:settings:v1') ?? '{}').theme).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.documentElement.lang).toBe('en');
    expect(s.t().settings.title).toBe('Settings');
  });

  it('follows the device for the system theme', () => {
    const s = service();
    s.update({ theme: 'system' });
    expect(document.documentElement.dataset['theme']).toBe('light');
    matches = true;
    listener?.();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('formats amounts by language and explicit format', () => {
    const s = service();
    expect(s.formatAmount(1234.5)).toBe('1\u00A0234,50\u00A0\u20AC');
    expect(s.formatAmount(-0.5)).toBe('-0,50\u00A0\u20AC');
    expect(s.formatSigned('income', 2)).toBe('+2,00\u00A0\u20AC');
    expect(s.formatSigned('expense', 2)).toBe('-2,00\u00A0\u20AC');
    s.update({ language: 'en', currency: 'USD' });
    expect(s.formatAmount(1234.5)).toBe('$1,234.50');
    s.update({ amountFormat: 'space-comma', currency: 'CHF' });
    expect(s.formatAmount(1234.5)).toBe('1\u00A0234,50\u00A0CHF');
    s.update({ amountFormat: 'comma-dot', currency: 'GBP', language: 'fr' });
    expect(s.formatAmount(10)).toBe('\u00A310.00');
  });

  it('formats and normalizes edit-field input with the format separator', () => {
    const s = service();
    expect(s.decimalSeparator).toBe(',');
    expect(s.formatInput(3)).toBe('3,00');
    expect(s.normalizeInput(' ')).toBe('');
    expect(s.normalizeInput('1 234.5')).toBe('1234,50');
    expect(s.normalizeInput('abc')).toBe('abc');
    s.update({ amountFormat: 'comma-dot' });
    expect(s.decimalSeparator).toBe('.');
    expect(s.formatInput(3)).toBe('3.00');
  });

  it('formats dates by language and explicit format', () => {
    const s = service();
    expect(s.formatDate('2026-03-09')).toBe('09/03/2026');
    s.update({ language: 'en' });
    expect(s.formatDate('2026-03-09')).toBe('03/09/2026');
    s.update({ dateFormat: 'yyyy-mm-dd' });
    expect(s.formatDate('2026-03-09')).toBe('2026-03-09');
    s.update({ dateFormat: 'dd-mm-yyyy' });
    expect(s.formatDate('2026-03-09')).toBe('09/03/2026');
  });

  it('labels months in the current language', () => {
    const s = service();
    expect(s.monthLabel('2026-01')).toBe('Janvier 2026');
    s.update({ language: 'en' });
    expect(s.monthLabel('2026-12')).toBe('December 2026');
  });
});
