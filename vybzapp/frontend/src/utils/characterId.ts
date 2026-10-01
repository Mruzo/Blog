/** Coerce API/form character values (id, numeric string, or `{ id }`) to a PK. */
export function resolveCharacterId(character: unknown): number {
  if (typeof character === 'number' && Number.isFinite(character) && character > 0) {
    return character;
  }
  if (typeof character === 'string' && character.trim()) {
    const parsed = parseInt(character, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (character && typeof character === 'object' && 'id' in character) {
    return resolveCharacterId((character as { id: unknown }).id);
  }
  return 0;
}
