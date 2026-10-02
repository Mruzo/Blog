import {
  filterPublicStoriesForStudio,
  filterWorkspaceStoriesForStudio,
  isStudioTeamMember,
} from '../studioScope';

const studio = { id: 7, owner: { id: 3 } };

describe('studioScope', () => {
  it('keeps only published stories tagged with the studio', () => {
    const stories = [
      { id: 1, studio: 7 },
      { id: 2, studio: 8 },
      { id: 3, studio: null, user: 3 },
    ];
    expect(filterPublicStoriesForStudio(stories, studio).map((s) => s.id)).toEqual([1]);
  });

  it('lets teammates see studio stories plus untagged owner drafts', () => {
    const stories = [
      { id: 1, studio: 7, user: 3 },
      { id: 2, studio: 8, user: 9 },
      { id: 3, studio: null, user: 3 },
      { id: 4, studio: null, user: 9 },
    ];
    expect(filterWorkspaceStoriesForStudio(stories, studio).map((s) => s.id)).toEqual([1, 3]);
  });

  it('treats owners and active collaborators as studio teammates', () => {
    const teamStudio = {
      id: 7,
      owner: { id: 3 },
      collaborators: [
        { id: 11, is_active: true, user: { id: 99 } },
        { id: 12, is_active: false, user: { id: 100 } },
      ],
    };
    expect(isStudioTeamMember(teamStudio, 3)).toBe(true);
    expect(isStudioTeamMember(teamStudio, 99)).toBe(true);
    expect(isStudioTeamMember(teamStudio, 100)).toBe(false);
    expect(isStudioTeamMember(teamStudio, 1)).toBe(false);
  });
});
