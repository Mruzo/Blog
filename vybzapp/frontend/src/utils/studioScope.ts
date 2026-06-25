export type StudioScopeInput = {
  id?: number;
};

export function filterPublicStoriesForStudio<T extends { studio?: number | null }>(
  stories: T[],
  studio: StudioScopeInput
): T[] {
  const studioId = studio.id;
  if (studioId == null || Number.isNaN(Number(studioId))) {
    return [];
  }
  return stories.filter((s) => Number(s.studio) === Number(studioId));
}
