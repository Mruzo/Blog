import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from './PageHeader';
import SmallButton from './SmallButton';
import BackButton from './BackButton';
import LoadingSpinner from './LoadingSpinner';
import MessagePopup from './MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../services/api';

// Step Components
import StoryDetailsStep from './story-creation/StoryDetailsStep';
import SeasonSetupStep from './story-creation/SeasonSetupStep';
import CharactersStep from './story-creation/CharactersStep';
import EpisodeSetupStep from './story-creation/EpisodeSetupStep';
import DialoguesStep from './story-creation/DialoguesStep';
import ModelUploadStep from './story-creation/ModelUploadStep';
import PreviewStep from './story-creation/PreviewStep';
import PublishStep from './story-creation/PublishStep';

export interface StoryCreationData {
  // Story data (Comic model)
  story: {
    id?: number;
    title: string;
    description: string;
    is_public: boolean;
  };
  
  // Season data
  season: {
    id?: number;
    title: string;
    season_number: number;
    description: string;
    release_date: string;
  };
  
  // Characters data
  characters: Array<{
    id?: number;
    name: string;
    bio: string;
    personality: string;
    love_interest: string;
  }>;
  
  // Episode data
  episode: {
    id?: number;
    title: string;
    episode_number: number;
    description: string;
    summary: string;
    is_published: boolean;
  };
  
  // Dialogues data
  dialogues: Array<{
    id?: number;
    character: number; // Character ID (who is speaking)
    text: string;
    order: number;
    scene_title: string;
    scene_description: string;
    shot_type: string;
    camera_orbit: string;
    camera_target: string;
    field_of_view: number;
    zoom_speed: number;
    rotation: string;
  }>;
  
  // 3D Model data
  model: {
    file: File | null;
    file_url: string;
    format: 'gltf' | 'glb' | 'usdz';
    previewUrl: string | null;
  };
  
  // Camera settings
  cameraPosition: string;
  cameraTarget: string;
  
  // Publishing data
  publish: {
    is_published: boolean;
    publish_date: string;
  };
}

const steps = [
  { id: 'story', title: 'Story Details', component: StoryDetailsStep },
  { id: 'characters', title: 'Characters', component: CharactersStep },
  { id: 'season', title: 'Season Setup', component: SeasonSetupStep },
  { id: 'episode', title: 'Episodes', component: EpisodeSetupStep },
  { id: 'dialogues', title: 'Dialogues', component: DialoguesStep },
  { id: 'model', title: '3D Model', component: ModelUploadStep },
  { id: 'preview', title: 'Preview/Edit', component: PreviewStep },
  { id: 'publish', title: 'Publish', component: PublishStep },
];

const StoryCreationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId?: string }>();
  const { loadStories } = useApi();
  const { createStory, createSeason, createCharacter, createEpisode, createDialogue, isLoading, error } = useApi();
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize data structure
  const [data, setData] = useState<StoryCreationData>({
    story: {
      title: '',
      description: '',
      is_public: false,
    },
    season: {
      title: '',
      season_number: 1,
      description: '',
      release_date: '',
    },
    characters: [],
    episode: {
      title: '',
      episode_number: 1,
      description: '',
      summary: '',
      is_published: false,
    },
    dialogues: [],
    model: {
      file: null,
      file_url: '',
      format: 'glb',
      previewUrl: null,
    },
    cameraPosition: '0deg 75deg 3m',
    cameraTarget: '0m 1.6m 0m',
    publish: {
      is_published: false,
      publish_date: '',
    },
  });

  // Update URL as user progresses through steps
  // Check authentication on mount and handle redirects
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // User is not authenticated, redirect to login
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      window.location.href = `/login/?next=${encodeURIComponent(currentPath)}`;
      return;
    }
    
    // Check if we're returning from login (check sessionStorage)
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath && redirectPath.includes('/story/create/')) {
      // Clear the redirect path now that we're here
      sessionStorage.removeItem('redirectAfterLogin');
    }
  }, []);

  useEffect(() => {
    const step = steps[currentStep];
    if (step) {
      const newUrl = `/immersivecomics/story/create/${step.id}/`;
      if (window.location.pathname !== newUrl) {
        navigate(newUrl, { replace: true });
      }
    }
  }, [currentStep, navigate]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Custom handleNext that calls the step's handleNext if it exists
  const handleStepNext = () => {
    // The step components will override this with their own handleNext
    handleNext();
  };

  // Custom onNext for CharactersStep
  const customOnNext = async () => {
    // This will be overridden by the CharactersStep component
    handleNext();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleDataUpdate = (stepData: Partial<StoryCreationData>) => {
    setData(prev => ({ ...prev, ...stepData }));
  };

  const handleSave = async () => {
    console.log('StoryCreationWizard: handleSave called!');
    try {
      setIsSaving(true);
      
      // Validate that we have at least a story title
      if (!data.story.title.trim()) {
        setMessage('Please enter a story title before saving as draft.');
        setMessageType('warning');
        setShowMessage(true);
        setIsSaving(false);
        return;
      }
      
      // Create story as draft (not published)
      const storyData = {
        ...data.story,
        title: data.story.title.trim(), // Ensure no leading/trailing spaces
        description: data.story.description.trim() || 'No description provided',
        is_public: false // Always save as draft
      };
      
      // Ensure season has a valid release_date and title
      const seasonData = {
        ...data.season,
        title: data.season.title.trim() || `Season 1 of ${storyData.title}`,
        release_date: data.season.release_date || '2024-01-01' // Default date if empty
      };
      
      // Ensure episode has a title
      const episodeData = {
        ...data.episode,
        title: data.episode.title.trim() || `Episode 1 of ${storyData.title}`
      };
      
      console.log('StoryCreationWizard: Creating complete story with data:', {
        story: storyData,
        season: seasonData,
        characters: data.characters,
        episode: episodeData,
        dialogues: data.dialogues
      });

      const result = await apiService.createCompleteStory({
        story: storyData,
        season: seasonData,
        characters: data.characters,
        episode: episodeData,
        dialogues: data.dialogues,
        model: data.model.file || undefined
      });
      
      console.log('StoryCreationWizard: Story created successfully:', result);
      
      setMessage('Draft saved successfully! You can continue editing later.');
      setMessageType('success');
      setShowMessage(true);
      
      // Update the data with the saved IDs
      setData(prev => ({ 
        ...prev,
        story: { ...prev.story, id: result.story.id },
        season: { ...prev.season, id: result.season.id },
        episode: { ...prev.episode, id: result.episode.id }
      }));
      
      // Refresh the stories list in the global context so MyStudio shows the new story
      await loadStories();
      
      // Don't navigate - stay on the same page
      // The user can continue editing or navigate manually
    } catch (error: any) {
      console.error('Save draft error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setMessage(error.message || 'Failed to save draft. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const currentStepComponent = steps[currentStep];
  const StepComponent = currentStepComponent.component;

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="Create New Story"
        description="Build your immersive 3D comic story step by step"
        actions={
          <>
            <BackButton to="/immersivecomics/" />
            <SmallButton 
              variant="outline-primary"
              onClick={() => {
                console.log('Save Draft button clicked!');
                handleSave();
              }}
              disabled={isSaving}
            >
              <i className="fas fa-save me-1"></i>{isSaving ? 'Saving...' : 'Save Draft'}
            </SmallButton>
          </>
        }
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      {/* Progress Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row">
            {steps.map((step, index) => (
              <div key={step.id} className="col-12 col-md-6 col-lg-3 mb-2">
                <div 
                  className={`d-flex align-items-center p-2 rounded cursor-pointer ${
                    index === currentStep 
                      ? 'bg-primary text-white' 
                      : index < currentStep 
                        ? 'bg-success text-white' 
                        : 'bg-light text-muted'
                  }`}
                  onClick={() => handleStepClick(index)}
                  style={{ cursor: index <= currentStep ? 'pointer' : 'not-allowed' }}
                >
                  <div className="me-2">
                    {index < currentStep ? (
                      <i className="fas fa-check-circle"></i>
                    ) : index === currentStep ? (
                      <i className="fas fa-play-circle"></i>
                    ) : (
                      <i className="fas fa-circle"></i>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="subtext-btn-sm fw-bold">{step.title}</div>
                    <div className="subtext-btn-sm" style={{ fontSize: '0.75rem' }}>
                      Step {index + 1} of {steps.length}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <StepComponent
              data={data}
              onDataUpdate={handleDataUpdate}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstStep={currentStep === 0}
              isLastStep={currentStep === steps.length - 1}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="d-flex justify-content-between mt-4">
        <SmallButton
          variant="outline-secondary"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <i className="fas fa-arrow-left me-1"></i>Previous
        </SmallButton>
        
        <div className="d-flex gap-2">
          {currentStep === steps.length - 1 ? (
            <SmallButton
              variant="success"
              onClick={handleSave}
              disabled={isLoading}
            >
              <i className="fas fa-rocket me-1"></i>Publish Story
            </SmallButton>
          ) : (
            <SmallButton
              variant="primary"
              onClick={handleNext}
            >
              Next<i className="fas fa-arrow-right ms-1"></i>
            </SmallButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCreationWizard;
