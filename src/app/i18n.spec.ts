import { STRINGS } from './i18n';

/** Every dotted path of the dictionary, with the type of its leaf. */
function leaves(value: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (Array.isArray(value)) {
    out.set(prefix, `array:${value.length}`);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, type] of leaves(child, prefix === '' ? key : `${prefix}.${key}`)) out.set(path, type);
    }
  } else {
    out.set(prefix, typeof value);
  }
  return out;
}

describe('i18n dictionaries', () => {
  it('cover both languages with the same keys and leaf types', () => {
    expect(Object.keys(STRINGS).sort()).toEqual(['en', 'fr']);
    expect([...leaves(STRINGS.fr)]).toEqual([...leaves(STRINGS.en)]);
  });

  it.each(['en', 'fr'] as const)('%s has twelve months and a label for every calendar state', (language) => {
    const strings = STRINGS[language];
    expect(strings.months).toHaveLength(12);
    expect(new Set(strings.months).size).toBe(12);
    expect(Object.keys(strings.calendar.states).sort()).toEqual(['disabled', 'error', 'offline', 'online', 'syncing']);
  });

  it.each(['en', 'fr'] as const)('%s has no empty text', (language) => {
    for (const [path, type] of leaves(STRINGS[language])) {
      if (type === 'string') {
        const text = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], STRINGS[language]);
        expect(text, path).not.toBe('');
      }
    }
  });

  it.each(['en', 'fr'] as const)('%s formats its parameterised texts', (language) => {
    const strings = STRINGS[language];
    expect(strings.budget.deleteBody('Loyer (-700 €)')).toContain('Loyer (-700 €)');
    expect(strings.calendar.lastSync('2026-10-13')).toContain('2026-10-13');
    expect(strings.calendar.serverError('boom')).toContain('boom');
    for (const count of [0, 1, 7]) expect(strings.calendar.conflicts(count)).toContain(String(count));
    expect(strings.categories.exists('Loisirs')).toContain('Loisirs');
    expect(strings.categories.deleteBody('Loisirs')).toContain('Loisirs');
    expect(strings.recurrences.deleteBody('Gym')).toContain('Gym');
    expect(strings.recurrences.from('Janvier 2026')).toContain('Janvier 2026');
    const range = strings.recurrences.range('Janvier 2026', 'Juin 2026', 6);
    expect(range).toContain('Janvier 2026');
    expect(range).toContain('Juin 2026');
    expect(range).toContain('6');
    for (const day of [1, 15, 31]) expect(strings.recurrences.dayOf(day)).toContain(String(day));
  });
});
