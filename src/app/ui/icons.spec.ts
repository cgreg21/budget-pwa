import { CATEGORY_ICON_CHOICES, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ICON } from 'budget-lib';

import { UI_ICONS, categoryGlyph, glyph } from './icons';

describe('icons', () => {
  it('turns an icon name into one Material Design Icons glyph', () => {
    expect(glyph('wallet')).toBe(String.fromCodePoint(0xF0584));
    expect([...glyph('chevron-left')]).toHaveLength(1);
  });

  it('defines distinct single-glyph icons for the interface', () => {
    const glyphs = Object.values(UI_ICONS);
    for (const text of glyphs) expect([...text]).toHaveLength(1);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('draws every category icon the library offers', () => {
    const fallback = categoryGlyph(DEFAULT_CATEGORY_ICON);
    const drawn = CATEGORY_ICON_CHOICES.map((choice) => categoryGlyph(choice.name));
    for (const text of drawn) expect([...text]).toHaveLength(1);
    expect(drawn.filter((text) => text === fallback)).toHaveLength(1);
    for (const category of DEFAULT_CATEGORIES) expect([...categoryGlyph(category.icon)]).toHaveLength(1);
  });

  it('falls back to the folder for unknown or legacy names', () => {
    const fallback = categoryGlyph(DEFAULT_CATEGORY_ICON);
    expect(fallback).toBe(glyph('folder'));
    expect(categoryGlyph('no-such-icon')).toBe(fallback);
    expect(categoryGlyph('')).toBe(fallback);
    expect(categoryGlyph('tabler:bus')).toBe(glyph('bus'));
  });
});
