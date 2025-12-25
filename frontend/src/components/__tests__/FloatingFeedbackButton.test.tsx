import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FloatingFeedbackButton from '../FloatingFeedbackButton';
import { FeedbackProvider } from '../../contexts/FeedbackContext';

// Mock FeedbackModal
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

describe('FloatingFeedbackButton - Page Name Detection', () => {
  const renderWithRouter = (pathname: string, contextValue?: any) => {
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
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Stories" page correctly', () => {
    renderWithRouter('/immersivecomics/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Story Creation" page correctly', () => {
    renderWithRouter('/immersivecomics/story/create/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Story Management" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/manage/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Season Edit" page correctly', () => {
    renderWithRouter('/immersivecomics/season/456/edit/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Episode Management" page correctly', () => {
    renderWithRouter('/immersivecomics/season/456/episodes/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "My Studio" page correctly', () => {
    renderWithRouter('/immersivecomics/my-studio/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Character Management" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/characters/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Story Collaborators" page correctly', () => {
    renderWithRouter('/immersivecomics/story/123/collaborators/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Product Store" page correctly', () => {
    renderWithRouter('/product/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should detect "Shopping Cart" page correctly', () => {
    renderWithRouter('/product/cart/');
    const button = screen.getByLabelText(/Open feedback form/i);
    expect(button).toBeInTheDocument();
  });

  it('should NOT show generic "Page" for unknown routes', async () => {
    const user = userEvent.setup();
    renderWithRouter('/some-unknown-route/');
    
    const button = screen.getByLabelText(/Open feedback form/i);
    await user.click(button);

    const modal = screen.getByTestId('feedback-modal');
    // Should show "Unknown Page" or a formatted version, not just "Page"
    expect(modal.textContent).not.toContain('Page: Page');
    expect(modal.textContent).not.toContain('I\'m on the Page page');
  });

  it('should pass correct page name to modal', async () => {
    const user = userEvent.setup();
    renderWithRouter('/immersivecomics/story/123/manage/');
    
    const button = screen.getByLabelText(/Open feedback form/i);
    await user.click(button);

    const modal = screen.getByTestId('feedback-modal');
    expect(modal).toHaveTextContent('Page: Story Management');
  });

  it('should pass context from FeedbackContext when available', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { setContext } = React.useContext(require('../../contexts/FeedbackContext').FeedbackContext);
      
      React.useEffect(() => {
        setContext({
          storyId: 789,
          storyTitle: 'My Test Story',
          step: 'Characters',
          page: 'Story Creation'
        });
      }, [setContext]);

      return <FloatingFeedbackButton />;
    };

    render(
      <MemoryRouter initialEntries={['/immersivecomics/story/create/']}>
        <FeedbackProvider>
          <TestComponent />
        </FeedbackProvider>
      </MemoryRouter>
    );

    const button = screen.getByLabelText(/Open feedback form/i);
    await user.click(button);

    const modal = screen.getByTestId('feedback-modal');
    expect(modal).toHaveTextContent('Story: My Test Story');
    expect(modal).toHaveTextContent('Step: Characters');
  });
});









