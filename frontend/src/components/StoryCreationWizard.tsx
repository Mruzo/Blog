import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SmallButton from './SmallButton';
import BackButton from './BackButton';
import LoadingSpinner from './LoadingSpinner';
import MessagePopup from './MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../services/api';
import { FeedbackContext } from '../contexts/FeedbackContext';

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
    pov_head_x?: number;
    pov_head_y?: number;
    pov_head_z?: number;
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
  { id: 'story', title: 'Title & Description', component: StoryDetailsStep },
  { id: 'characters', title: 'Characters', component: CharactersStep },
  { id: 'season', title: 'Season', component: SeasonSetupStep },
  { id: 'episode', title: 'Episodes', component: EpisodeSetupStep },
  { id: 'dialogues', title: 'Dialogues', component: DialoguesStep },
  { id: 'model', title: 'Scene', component: ModelUploadStep },
  { id: 'preview', title: 'Preview & Edit', component: PreviewStep },
  { id: 'publish', title: 'Publish', component: PublishStep },
];

const StoryCreationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId?: string }>();
  const { loadStories, currentUser } = useApi();
  const { createStory, createSeason, createCharacter, createEpisode, createDialogue, isLoading, error } = useApi();
  const feedbackContext = useContext(FeedbackContext);
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

  // Set feedback context for story creation
  useEffect(() => {
    if (feedbackContext) {
      const stepName = steps[currentStep]?.title || 'Unknown';
      feedbackContext.setContext({
        step: stepName,
        page: 'Story Creation',
        storyTitle: data.story.title || undefined,
        storyId: data.story.id
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, data.story.title, data.story.id]);

  // Check authentication on mount and handle redirects
  useEffect(() => {
    // Check if user is authenticated - check token first (immediate check)
    const token = localStorage.getItem('authToken');
    if (!token) {
      // No token, redirect immediately
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }
    
    // If we have a token but no user yet, wait a moment for user to load
    // If after a short delay there's still no user, redirect
    if (!currentUser) {
      const timeout = setTimeout(() => {
        // Still no user after waiting, redirect to login
        const currentPath = window.location.pathname;
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
      }, 1000); // Wait 1 second for user to load
      
      return () => clearTimeout(timeout);
    }
    
    // User is authenticated, check if we're returning from login
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath && redirectPath.includes('/story/create/')) {
      // Clear the redirect path now that we're here
      sessionStorage.removeItem('redirectAfterLogin');
    }
  }, [navigate, currentUser]);

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

  // Show loading spinner while checking authentication
  const token = localStorage.getItem('authToken');
  if (!token || !currentUser) {
    return <LoadingSpinner />;
  }

  const currentStepComponent = steps[currentStep];
  const StepComponent = currentStepComponent.component;

  return (
    <div className="container mt-2 p-2 p-md-4" style={{ maxWidth: '1200px' }}>
      {/* Custom Header with title and buttons on same row */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="flex-grow-1">
          <h1 className="subtext-btn mb-0">Create New Story</h1>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <BackButton to="/immersivecomics/" />
          <SmallButton 
            variant="outline-primary"
            onClick={() => {
              console.log('Save Draft button clicked!');
              handleSave();
            }}
            disabled={isSaving}
          >
            <i className="fas fa-save me-1"></i>{isSaving ? 'Saving...' : ' Save Draft'}
          </SmallButton>
        </div>
      </div>
      
      {/* Description */}
      <div className="mb-2">
        <p className="subtext-btn-sm text-muted mb-0">Story Building Process.</p>
      </div>

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      {/* Step Indicator - Modern Step Wizard Structure */}
      <div className="card border-0 shadow-sm mb-2 font-quicksand">
        <div className="card-body p-2 p-md-4">
          <div className="step-indicator-wrapper" style={{ position: 'relative' }}>
            {/* Step Items */}
            <div className="d-flex justify-content-between align-items-start" style={{ position: 'relative', zIndex: 2 }}>
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div
                    key={step.id}
                    className="step-item"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      cursor: index <= currentStep ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => index <= currentStep && handleStepClick(index)}
                  >
                    {/* Step Circle */}
                    <div
                      className="step-circle"
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        border: '3px solid',
                        backgroundColor: isActive 
                          ? '#007bff' 
                          : isCompleted 
                            ? '#28a745' 
                            : '#e9ecef',
                        borderColor: isActive 
                          ? '#007bff' 
                          : isCompleted 
                            ? '#28a745' 
                            : '#dee2e6',
                        color: isActive || isCompleted ? '#fff' : '#6c757d',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        zIndex: 3
                      }}
                    >
                      {isCompleted ? (
                        <i className="fas fa-check step-circle-icon" style={{ fontSize: '10px' }}></i>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Step Label */}
                    <div
                      className="step-label"
                      style={{
                        marginTop: '10px',
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: isActive ? '600' : '400',
                        color: isActive 
                          ? '#007bff' 
                          : isCompleted 
                            ? '#28a745' 
                            : '#6c757d',
                        maxWidth: '100px',
                        lineHeight: '1.3'
                      }}
                    >
                      {step.title}
                    </div>
                    
                    {/* Connecting Line */}
                    {index < steps.length - 1 && (
                      <div
                        className="step-line"
                        style={{
                          position: 'absolute',
                          top: '25px',
                          left: 'calc(50% + 25px)',
                          width: 'calc(100% - 50px)',
                          height: '3px',
                          backgroundColor: index < currentStep ? '#28a745' : '#dee2e6',
                          zIndex: 1,
                          transition: 'background-color 0.3s ease'
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Progress Bar Background */}
            <div
              className="step-progress-bg"
              style={{
                position: 'absolute',
                top: '25px',
                left: '25px',
                right: '25px',
                height: '3px',
                backgroundColor: '#e9ecef',
                zIndex: 1,
                borderRadius: '2px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-2">
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
      <div className="d-flex justify-content-between mt-2">
        <SmallButton
          variant="outline-secondary"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <i className="fas fa-arrow-left me-1"></i> Previous
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
              Next <i className="fas fa-arrow-right ms-1"></i>
            </SmallButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCreationWizard;
