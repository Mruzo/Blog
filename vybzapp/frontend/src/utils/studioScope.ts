/**
 * Studio-scoped public stories: approved public comics owned by the studio owner
 * or by any active studio collaborator (same catalog as getPublicStories, filtered client-side).
 */
export type StudioScopeOwner = { id: number } | number | null | undefined;

export type StudioScopeCollaborator = {
  user?: { id?: number };
};

export type StudioScopeInput = {
  owner?: StudioScopeOwner;
  collaborators?: StudioScopeCollaborator[];
};

export function getStudioMemberUserIds(studio: StudioScopeInput): Set<number> {
  const ids = new Set<number>();
  if (studio.owner != null && studio.owner !== undefined) {
    const oid = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
    if (oid != null && !Number.isNaN(Number(oid))) {
      ids.add(Number(oid));
    }
  }
  for (const c of studio.collaborators || []) {
    const uid = c.user?.id;
    if (uid != null && !Number.isNaN(Number(uid))) {
      ids.add(Number(uid));
    }
  }
  return ids;
}

export function filterPublicStoriesForStudio<T extends { user: number }>(
  stories: T[],
  studio: StudioScopeInput
): T[] {
  const memberIds = getStudioMemberUserIds(studio);
  if (memberIds.size === 0) {
    return [];
  }
  return stories.filter((s) => memberIds.has(Number(s.user)));
}
