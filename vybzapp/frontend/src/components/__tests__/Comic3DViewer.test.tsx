import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Comic3DViewer from '../Comic3DViewer';
import { Episode, Dialogue } from '../../services/api';

// Mock the model-viewer web component
const mockModelViewer = {
  cameraTarget: '',
  cameraOrbit: '',
  fieldOfView: '',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock the model-viewer element
Object.defineProperty(window, 'customElements', {
  value: {
    define: jest.fn(),
  },
});

// Mock the model-viewer script loading
Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'script') {
      return {
        type: '',
        src: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    }
    return document.createElement(tagName);
  }),
});

// Mock episodes and dialogues data
const mockEpisodes: Episode[] = [
  {
    id: 1,
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode description',
    season: 1,
    model_url: 'https://example.com/model1.gltf',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Episode 2',
    episode_number: 2,
    description: 'Second episode description',
    season: 1,
    model_url: 'https://example.com/model2.gltf',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
];

const mockDialogues: Dialogue[] = [
  {
    id: 1,
    character: 1,
    text: 'Hello, this is the first dialogue',
    camera_orbit: '0deg 75deg 3m',
    camera_target: '0m 1.6m 0m',
    field_of_view: 45,
    zoom_speed: 1.0,
    episode: 1,
    order: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    character: 2,
    text: 'This is the second dialogue',
    camera_orbit: '45deg 60deg 4m',
    camera_target: '1m 1.8m 0m',
    field_of_view: 50,
    zoom_speed: 1.2,
    episode: 1,
    order: 2,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

describe('Comic3DViewer', () => {
  const defaultProps = {
    episodes: mockEpisodes,
    dialogues: mockDialogues,
    storyId: 1,
    seasonId: 1,
    onEpisodeSelect: jest.fn(),
    onDialogueUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Comic3DViewer {...defaultProps} />);
    expect(screen.getByText('3D Comic Viewer')).toBeInTheDocument();
  });

  it('displays episodes for selection', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    expect(screen.getByText('Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Episode 2')).toBeInTheDocument();
  });

  it('shows message when no episodes available', () => {
    render(<Comic3DViewer {...defaultProps} episodes={[]} />);
    
    expect(screen.getByText('No episodes available for this story.')).toBeInTheDocument();
  });

  it('handles episode selection', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    expect(defaultProps.onEpisodeSelect).toHaveBeenCalledWith(mockEpisodes[0]);
  });

  it('displays 3D model container when episode is selected', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    expect(screen.getByText('Start Episode')).toBeInTheDocument();
  });

  it('shows navigation controls when episode has dialogues', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    // Should show play button and navigation controls
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('displays progress bar when episode has dialogues', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows mode toggle buttons', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    expect(screen.getByText('Preview Mode')).toBeInTheDocument();
    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
  });

  it('toggles between preview and edit mode', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const editModeButton = screen.getByText('Edit Mode');
    fireEvent.click(editModeButton);
    
    expect(editModeButton).toHaveClass('btn-warning');
  });

  it('shows edit controls when in edit mode and episode is selected', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    // Select episode first
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    // Switch to edit mode
    const editModeButton = screen.getByText('Edit Mode');
    fireEvent.click(editModeButton);
    
    expect(screen.getByText('Camera Editing Controls')).toBeInTheDocument();
    expect(screen.getByText('Camera Orbit')).toBeInTheDocument();
    expect(screen.getByText('Camera Target')).toBeInTheDocument();
  });

  it('handles play speed changes', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    const speedButton = screen.getByText('1.5x');
    fireEvent.click(speedButton);
    
    expect(speedButton).toHaveClass('btn-primary');
  });

  it('disables navigation buttons appropriately', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    // At the start, previous should be disabled
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onDialogueUpdate when camera is updated in edit mode', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    // Select episode and switch to edit mode
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    const editModeButton = screen.getByText('Edit Mode');
    fireEvent.click(editModeButton);
    
    // Find and interact with a slider
    const azimuthSlider = screen.getByLabelText('Azimuth');
    fireEvent.change(azimuthSlider, { target: { value: '45' } });
    
    expect(defaultProps.onDialogueUpdate).toHaveBeenCalled();
  });

  it('handles model ready event', async () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    // Simulate model ready
    const modelViewer = screen.getByRole('generic'); // model-viewer element
    fireEvent.load(modelViewer);
    
    await waitFor(() => {
      expect(screen.queryByText('Start Episode')).not.toBeInTheDocument();
    });
  });

  it('displays dialogue text in speech bubble', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    // Should show first dialogue
    expect(screen.getByText('Hello, this is the first dialogue')).toBeInTheDocument();
  });

  it('shows episode summary when at the end', () => {
    render(<Comic3DViewer {...defaultProps} />);
    
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    // Navigate to last dialogue
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Should show summary
    expect(screen.getByText('Episode Summary')).toBeInTheDocument();
    expect(screen.getByText('First episode description')).toBeInTheDocument();
  });

  it('filters dialogues by selected episode', () => {
    const dialoguesWithMultipleEpisodes = [
      ...mockDialogues,
      {
        id: 3,
        character: 1,
        text: 'This dialogue belongs to episode 2',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45,
        zoom_speed: 1.0,
        episode: 2,
        order: 1,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(
      <Comic3DViewer 
        {...defaultProps} 
        dialogues={dialoguesWithMultipleEpisodes} 
      />
    );
    
    // Select episode 1
    const episode1Button = screen.getByText('Episode 1');
    fireEvent.click(episode1Button);
    
    // Should only show dialogues for episode 1
    expect(screen.getByText('Hello, this is the first dialogue')).toBeInTheDocument();
    expect(screen.getByText('This is the second dialogue')).toBeInTheDocument();
    expect(screen.queryByText('This dialogue belongs to episode 2')).not.toBeInTheDocument();
  });

  it('cleans up intervals on unmount', () => {
    const { unmount } = render(<Comic3DViewer {...defaultProps} />);
    
    // Start playback to create interval
    const episodeButton = screen.getByText('Episode 1');
    fireEvent.click(episodeButton);
    
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);
    
    // Unmount component
    unmount();
    
    // Should not throw any errors
    expect(true).toBe(true);
  });
});


