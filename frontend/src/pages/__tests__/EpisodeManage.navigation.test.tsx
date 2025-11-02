import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EpisodeManage from '../EpisodeManage';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockApiContext = {
  stories: [],
  seasons: [
    {
      id: 4,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 8, // This is the story ID
      model_gltf: 'http://example.com/model.glb',
      model_usdz: 'http://example.com/model.usdz',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  characters: [],
  episodes: [],
  dialogues: [],
  myStudio: null,
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadStory: jest.fn(),
  loadSeasons: jest.fn(),
  loadCharacters: jest.fn(),
  loadEpisodes: jest.fn(),
  loadDialogues: jest.fn(),
  loadMyStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createStory: jest.fn(),
  createCompleteStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createCharacter: jest.fn(),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
  clearError: jest.fn()
};

// Mock useParams to return a seasonId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ seasonId: '4' })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext}>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('EpisodeManage Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the episode management page with correct title', () => {
    renderWithProviders(<EpisodeManage />);
    
    expect(screen.getByText('Episode Management')).toBeInTheDocument();
    expect(screen.getByText('Create and manage episodes and dialogues for your season')).toBeInTheDocument();
  });

  it('displays the back button with correct navigation path', () => {
    renderWithProviders(<EpisodeManage />);
    
    const backButton = screen.getByRole('link', { name: /back/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute('href', '/immersivecomics/story/8/manage/');
  });

  it('loads characters for the correct story when season is found', () => {
    renderWithProviders(<EpisodeManage />);
    
    expect(mockApiContext.loadCharacters).toHaveBeenCalledWith(8);
  });

  it('loads episodes for the correct season', () => {
    renderWithProviders(<EpisodeManage />);
    
    expect(mockApiContext.loadEpisodes).toHaveBeenCalledWith(4);
  });

  it('handles case when season is not found', () => {
    const emptyApiContext = {
      ...mockApiContext,
      seasons: []
    };
    
    render(
      <BrowserRouter>
        <ApiProvider value={emptyApiContext}>
          <EpisodeManage />
        </ApiProvider>
      </BrowserRouter>
    );
    
    // Should still render but with fallback navigation
    const backButton = screen.getByRole('link', { name: /back/i });
    expect(backButton).toHaveAttribute('href', '/immersivecomics/');
  });

  it('displays season information in the page', () => {
    renderWithProviders(<EpisodeManage />);
    
    // The page should show episodes for the season
    expect(screen.getByText('Episodes (0)')).toBeInTheDocument();
    expect(screen.getByText('No episodes created yet')).toBeInTheDocument();
  });

  it('shows add episode button', () => {
    renderWithProviders(<EpisodeManage />);
    
    const addEpisodeButtons = screen.getAllByText(/add episode/i);
    expect(addEpisodeButtons).toHaveLength(2); // One in header, one in empty state
  });

  it('shows dialogues section', () => {
    renderWithProviders(<EpisodeManage />);
    
    expect(screen.getByText('Dialogues')).toBeInTheDocument();
    expect(screen.getByText('Select an episode to manage dialogues')).toBeInTheDocument();
  });
});


