export type StudioScopeInput = {
  id?: number;
  owner?: number | { id?: number } | null;
  collaborators?: Array<{
    is_active?: boolean;
    user?: { id?: number } | null;
    id?: number;
  }>;
};

export function studioOwnerId(studio: StudioScopeInput): number | null {
  if (studio.owner == null) return null;
  if (typeof studio.owner === 'object') {
    return studio.owner.id == null ? null : Number(studio.owner.id);
  }
  return Number(studio.owner);
}

export function isStudioTeamMember(studio: StudioScopeInput, userId?: number | null): boolean {
  if (userId == null || Number.isNaN(Number(userId))) return false;
  const ownerId = studioOwnerId(studio);
  if (ownerId != null && ownerId === Number(userId)) return true;
  return (studio.collaborators || []).some((collab) => {
    if (collab?.is_active === false) return false;
    const candidate = collab?.user?.id ?? collab?.id;
    return candidate != null && Number(candidate) === Number(userId);
  });
}

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

export function filterWorkspaceStoriesForStudio<
  T extends { studio?: number | null; user?: number | { id?: number } },
>(stories: T[], studio: StudioScopeInput): T[] {
  const studioId = studio.id;
  const ownerId =
    studio.owner && typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
  return stories.filter((story) => {
    if (studioId != null && story.studio != null && Number(story.studio) === Number(studioId)) {
      return true;
    }
    if (story.studio == null && ownerId != null) {
      const storyUserId =
        typeof story.user === 'object' && story.user !== null ? story.user.id : story.user;
      return storyUserId != null && Number(storyUserId) === Number(ownerId);
    }
    return false;
  });
}
