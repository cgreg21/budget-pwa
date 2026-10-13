import { readValidJson } from './storage';

const isNumber = (value: unknown): value is number => typeof value === 'number';

describe('readValidJson', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(readValidJson('k', isNumber, () => 7)).toEqual({ value: 7, corrupted: false });
  });

  it('returns the stored value when it passes the guard', () => {
    localStorage.setItem('k', '42');
    expect(readValidJson('k', isNumber, () => 7)).toEqual({ value: 42, corrupted: false });
    expect(localStorage.getItem('k')).toBe('42');
  });

  it('drops a value that fails the guard', () => {
    localStorage.setItem('k', '"text"');
    expect(readValidJson('k', isNumber, () => 7)).toEqual({ value: 7, corrupted: true });
    expect(localStorage.getItem('k')).toBeNull();
    expect(localStorage.getItem('k:corrupted')).toBeNull();
  });

  it('quarantines unreadable content when asked', () => {
    localStorage.setItem('k', '{not json');
    expect(readValidJson('k', isNumber, () => 7, true)).toEqual({ value: 7, corrupted: true });
    expect(localStorage.getItem('k')).toBeNull();
    expect(localStorage.getItem('k:corrupted')).toBe('{not json');
  });
});
