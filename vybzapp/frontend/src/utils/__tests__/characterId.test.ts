import { resolveCharacterId } from '../characterId';

describe('resolveCharacterId', () => {
  it('accepts numeric ids, numeric strings, and nested objects', () => {
    expect(resolveCharacterId(7)).toBe(7);
    expect(resolveCharacterId('7')).toBe(7);
    expect(resolveCharacterId({ id: 7 })).toBe(7);
  });

  it('returns 0 when no id is present', () => {
    expect(resolveCharacterId(0)).toBe(0);
    expect(resolveCharacterId('')).toBe(0);
    expect(resolveCharacterId(null)).toBe(0);
  });
});
