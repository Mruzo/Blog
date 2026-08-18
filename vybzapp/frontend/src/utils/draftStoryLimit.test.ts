import {
  MAX_DRAFT_STORIES_PER_STUDIO,
  DRAFT_STORY_LIMIT_MESSAGE,
  countDraftStories,
  isAtDraftStoryLimit,
} from './draftStoryLimit';

describe('draftStoryLimit', () => {
  it('counts unpublished stories as drafts', () => {
    expect(
      countDraftStories([
        { is_public: false },
        { is_public: true },
        { is_public: false },
      ])
    ).toBe(2);
  });

  it('treats missing is_public as a draft', () => {
    expect(countDraftStories([{}])).toBe(1);
  });

  it('is at the limit at 10 drafts', () => {
    const drafts = Array.from({ length: MAX_DRAFT_STORIES_PER_STUDIO }, () => ({
      is_public: false,
    }));
    expect(isAtDraftStoryLimit(drafts)).toBe(true);
    expect(isAtDraftStoryLimit(drafts.slice(0, 9))).toBe(false);
  });

  it('uses the studio draft limit copy', () => {
    expect(DRAFT_STORY_LIMIT_MESSAGE).toBe(
      "you're a perfect 10 in drafts. share some to create room for more."
    );
  });
});
