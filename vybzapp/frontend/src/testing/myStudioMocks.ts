import { createMockApiContext, createMockStudio } from './testHelpers';

/** Shared ApiContext mock for MyStudio-related component tests. */
export const createMyStudioMockContext = (overrides: Record<string, unknown> = {}) =>
  createMockApiContext({
    stories: [
      {
        id: 1,
        title: 'Test Story 1',
        description: 'A test story description',
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user: 1,
        moderation_status: 'approved',
      },
    ],
    myStudio: createMockStudio(),
    currentUser: { id: 1, username: 'testuser', first_name: 'Test' },
    loadStories: jest.fn().mockResolvedValue(undefined),
    loadMyStudio: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
