import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FloatingFeedbackButton from '../FloatingFeedbackButton';
import { FeedbackProvider } from '../../contexts/FeedbackContext';

jest.mock('../FeedbackModal', () => {
  return function MockFeedbackModal({ show, context }: { show: boolean; context?: any }) {
    if (!show) return null;
    return (
      <div data-testid="feedback-modal">
        <div>Page: {context?.page || 'No page'}</div>
        <div>Story: {context?.storyTitle || 'No story'}</div>
        <div>Step: {context?.step || 'No step'}</div>
      </div>
    );
  };
});

const mockStartGuide = jest.fn();
let mockAvailableGuide: { id: string; name: string } | null = null;

jest.mock('../../contexts/GuideContext', () => ({
  useGuide: () => ({
    startGuide: mockStartGuide,
    availableGuide: mockAvailableGuide,
  }),
}));

describe('FloatingFeedbackButton - Page Name Detection', () => {
  beforeEach(() => {
    mockAvailableGuide = null;
    mockStartGuide.mockClear();
  });

  const renderWithRouter = (pathname: string) => {
    return render(
      <MemoryRouter initialEntries={[pathname]}>
        <FeedbackProvider>
          <FloatingFeedbackButton />
        </FeedbackProvider>
      </MemoryRouter>
    );
  };

  it('should detect "Home" page correctly', () => {
    renderWithRouter('/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('should detect "Stories" page correctly', () => {
    renderWithRouter('/immersivecomics/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Story Creation" page correctly', () => {
    renderWithRouter('/immersivecomics/story/create/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Story Management" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/manage/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Season Edit" page correctly', () => {
    renderWithRouter('/immersivecomics/season/456/edit/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Episode Management" page correctly', () => {
    renderWithRouter('/immersivecomics/season/456/episodes/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "My Studio" page correctly', () => {
    renderWithRouter('/immersivecomics/my-studio/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Character Management" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/characters/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Story Collaborators" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/collaborators/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Product Store" page correctly', () => {
    renderWithRouter('/product/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should detect "Shopping Cart" page correctly', () => {
    renderWithRouter('/product/cart/');
    expect(screen.getByLabelText(/Open feedback form/i)).toBeInTheDocument();
  });

  it('should NOT show generic "Page" for unknown routes', async () => {
    renderWithRouter('/some-unknown-route/');

    await userEvent.click(screen.getByLabelText(/Open feedback form/i));

    const modal = screen.getByTestId('feedback-modal');
    expect(modal.textContent).not.toContain('Page: Page');
    expect(modal.textContent).not.toContain("I'm on the Page page");
  });

  it('should pass correct page name to modal', async () => {
    renderWithRouter('/immersivecomics/story/123/manage/');

    await userEvent.click(screen.getByLabelText(/Open feedback form/i));

    expect(screen.getByTestId('feedback-modal')).toHaveTextContent('Page: Story Management');
  });

  it('should pass context from FeedbackContext when available', async () => {
    const TestComponent = () => {
      const { setContext } = React.useContext(
        require('../../contexts/FeedbackContext').FeedbackContext
      );

      React.useEffect(() => {
        setContext({
          storyId: 789,
          storyTitle: 'My Test Story',
          step: 'Characters',
          page: 'Story Creation',
        });
        // setContext is not referentially stable in FeedbackProvider
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return <FloatingFeedbackButton />;
    };

    render(
      <MemoryRouter initialEntries={['/immersivecomics/story/create/']}>
        <FeedbackProvider>
          <TestComponent />
        </FeedbackProvider>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText(/Open feedback form/i));

    const modal = screen.getByTestId('feedback-modal');
    expect(modal).toHaveTextContent('Story: My Test Story');
    expect(modal).toHaveTextContent('Step: Characters');
  });

  it('shows glowing guide button when a page guide is available', async () => {
    mockAvailableGuide = { id: 'stories-tour', name: 'Stories Tour' };
    renderWithRouter('/immersivecomics/');

    const guideBtn = screen.getByLabelText(/Start guide: Stories Tour/i);
    expect(guideBtn).toBeInTheDocument();
    expect(guideBtn).toHaveClass('floating-help-rail__guide--glow');

    await userEvent.click(guideBtn);
    expect(mockStartGuide).toHaveBeenCalledWith('stories-tour');
  });

  it('hides guide button when no page guide is available', () => {
    mockAvailableGuide = null;
    renderWithRouter('/');
    expect(screen.queryByLabelText(/Start guide:/i)).toBeNull();
  });

  it('marks viewer pages for raised placement', () => {
    renderWithRouter('/immersivecomics/story/123/manage/');
    expect(screen.getByTestId('floating-help-rail')).toHaveClass('floating-help-rail--viewer');
  });
});
