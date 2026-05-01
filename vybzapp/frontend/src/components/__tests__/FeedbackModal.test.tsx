import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackModal from '../FeedbackModal';
import * as apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    submitContactForm: jest.fn(),
  },
}));

const mockApiService = apiService.default as jest.Mocked<typeof apiService.default>;

describe('FeedbackModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Name Detection', () => {
    it('should show correct page name for Story Creation', () => {
      const context = {
        page: 'Story Creation',
        step: 'Title & Description',
        url: 'http://localhost:3000/immersivecomics/story/create/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Story Creation/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Story Creation page/i)).toBeInTheDocument();
    });

    it('should show correct page name for Story Management', () => {
      const context = {
        page: 'Story Management',
        storyId: 123,
        storyTitle: 'My Test Story',
        url: 'http://localhost:3000/immersivecomics/story/123/manage/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: My Test Story/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm working on the story "My Test Story"/i)).toBeInTheDocument();
    });

    it('should show correct page name for Season Edit', () => {
      const context = {
        page: 'Season Edit',
        url: 'http://localhost:3000/immersivecomics/season/456/edit/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Season Edit/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Season Edit page/i)).toBeInTheDocument();
    });

    it('should show correct page name for Episode Management', () => {
      const context = {
        page: 'Episode Management',
        url: 'http://localhost:3000/immersivecomics/season/456/episodes/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Episode Management/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Episode Management page/i)).toBeInTheDocument();
    });

    it('should show correct page name for My Studio', () => {
      const context = {
        page: 'My Studio',
        url: 'http://localhost:3000/immersivecomics/my-studio/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: My Studio/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the My Studio page/i)).toBeInTheDocument();
    });

    it('should show correct page name for Character Management', () => {
      const context = {
        page: 'Character Management',
        url: 'http://localhost:3000/immersivecomics/story/123/characters/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Character Management/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Character Management page/i)).toBeInTheDocument();
    });

    it('should show correct page name for Story Collaborators', () => {
      const context = {
        page: 'Story Collaborators',
        url: 'http://localhost:3000/immersivecomics/story/123/collaborators/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Story Collaborators/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Story Collaborators page/i)).toBeInTheDocument();
    });

    it('prefills subject and body from context page when provided', () => {
      const context = {
        page: 'Settings',
        url: 'http://localhost:3000/settings/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement;
      const messageInput = screen.getByLabelText(/Message/i) as HTMLTextAreaElement;
      expect(subjectInput.value).toBe('Question about: Settings');
      expect(messageInput.value).toContain("I'm on the Settings page");
    });

    it('should handle pages with step information', () => {
      const context = {
        page: 'Story Creation',
        step: 'Characters',
        url: 'http://localhost:3000/immersivecomics/story/create/characters'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: Story Creation/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/I'm on the Story Creation page/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/\(Characters step\)/i)).toBeInTheDocument();
    });

    it('should include story ID in content when available', () => {
      const context = {
        page: 'Story Management',
        storyId: 789,
        storyTitle: 'Test Story',
        url: 'http://localhost:3000/immersivecomics/story/789/manage/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      const textarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain('Story ID: 789');
    });

    it('should include URL in content when available', () => {
      const testUrl = 'http://localhost:3000/immersivecomics/story/123/manage/';
      const context = {
        page: 'Story Management',
        url: testUrl
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      const textarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain(`Page URL: ${testUrl}`);
    });
  });

  describe('Context Pre-filling', () => {
    it('should prioritize story title over page name in subject', () => {
      const context = {
        page: 'Story Management',
        storyTitle: 'My Awesome Story',
        storyId: 123,
        url: 'http://localhost:3000/immersivecomics/story/123/manage/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement;
      expect(subjectInput.value).toBe('Question about: My Awesome Story');
      expect(subjectInput.value).not.toContain('Story Management');
    });

    it('should show page name when story title is not available', () => {
      const context = {
        page: 'My Studio',
        url: 'http://localhost:3000/immersivecomics/my-studio/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      expect(screen.getByDisplayValue(/Question about: My Studio/i)).toBeInTheDocument();
    });

    it('should handle context without page information', () => {
      const context = {
        url: 'http://localhost:3000/'
      };

      render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

      // Should not pre-fill subject or content when no page info
      const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement;
      const contentTextarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement;
      
      expect(subjectInput.value).toBe('');
      expect(contentTextarea.value).toContain('Page URL: http://localhost:3000/');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data including context', async () => {
      mockApiService.submitContactForm.mockResolvedValue({
        success: true,
        message: 'Thanks for reaching out!'
      });

      const t0 = new Date('2024-06-01T12:00:00.000Z').getTime();
      jest.useFakeTimers('modern');
      jest.setSystemTime(t0);
      try {
        const context = {
          page: 'Story Management',
          storyId: 123,
          storyTitle: 'Test Story',
          url: 'http://localhost:3000/immersivecomics/story/123/manage/'
        };

        render(<FeedbackModal show={true} onClose={mockOnClose} context={context} />);

        jest.setSystemTime(t0 + 5000);

        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });

        const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement;
        const contentTextarea = screen.getByLabelText(/Message/i) as HTMLTextAreaElement;

        expect(subjectInput.value).toContain('Test Story');
        expect(contentTextarea.value).toContain('Test Story');
        expect(contentTextarea.value).toContain('Story ID: 123');

        fireEvent.click(screen.getByRole('button', { name: /Send/i }));

        await waitFor(() => {
          expect(mockApiService.submitContactForm).toHaveBeenCalledWith(
            expect.objectContaining({
              full_name: 'John Doe',
              email: 'john@example.com',
              source: 'feedback_modal',
              subject: subjectInput.value,
              content: contentTextarea.value,
              _honeypot: '',
            })
          );
          const call = mockApiService.submitContactForm.mock.calls[0][0];
          expect(call).toHaveProperty('_form_time');
          expect(parseFloat(call._form_time)).toBeGreaterThanOrEqual(3);
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});













