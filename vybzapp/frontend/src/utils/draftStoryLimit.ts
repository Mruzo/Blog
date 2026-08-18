export const MAX_DRAFT_STORIES_PER_STUDIO = 10;

export const DRAFT_STORY_LIMIT_MESSAGE =
  "you're a perfect 10 in drafts. share some to create room for more.";

export function countDraftStories(
  stories: Array<{ is_public?: boolean }> | null | undefined
): number {
  return (stories || []).filter((story) => !story.is_public).length;
}

export function isAtDraftStoryLimit(
  stories: Array<{ is_public?: boolean }> | null | undefined
): boolean {
  return countDraftStories(stories) >= MAX_DRAFT_STORIES_PER_STUDIO;
}
