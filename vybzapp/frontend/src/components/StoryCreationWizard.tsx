import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
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
    scene_slot?: string | null;
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
  
  // Shared platform 3D model (preview URL only; no user upload)
  model: {
    file: File | null;
    file_url: string;
    format: 'gltf' | 'glb' | 'usdz';
    previewUrl: string | null;
    usesSharedModel: boolean;
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
  {
    id: 'story',
    title: 'Title & description',
    shortTitle: 'Basics',
    description: 'Name your story and write a short summary so readers know what to expect.',
    component: StoryDetailsStep,
  },
  {
    id: 'characters',
    title: 'Characters',
    shortTitle: 'Cast',
    description: 'Add the characters who will speak and appear in your 3D scenes.',
    component: CharactersStep,
  },
  {
    id: 'season',
    title: 'Season',
    shortTitle: 'Season',
    description: 'Group your episodes into a season. Episodes use the shared JustVybz 3D scene.',
    component: SeasonSetupStep,
  },
  {
    id: 'episode',
    title: 'Episode',
    shortTitle: 'Episode',
    description: 'Set up your first episode with a title and summary.',
    component: EpisodeSetupStep,
  },
  {
    id: 'dialogues',
    title: 'Dialogues',
    shortTitle: 'Script',
    description: 'Write script lines and camera framing for the shared 3D scene.',
    component: DialoguesStep,
  },
  {
    id: 'preview',
    title: 'Preview & edit',
    shortTitle: 'Preview',
    description: 'Review how your story looks in the shared 3D comic viewer.',
    component: PreviewStep,
  },
  {
    id: 'publish',
    title: 'Publish',
    shortTitle: 'Publish',
    description: 'Review your story, then publish it for readers or save it as a private draft.',
    component: PublishStep,
  },
];

const STEPS_WITH_FOOTER_NEXT = new Set(['story', 'characters', 'episode', 'dialogues', 'preview']);

// Note: preview is included so Next can flush per-dialogue camera settings to the API.

const StoryCreationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId?: string }>();
  const { loadStories, currentUser } = useApi();
  const { createStory, createSeason, createCharacter, createEpisode, createDialogue, updateDialogue, updateStory, isLoading, error } = useApi();
  const feedbackContext = useContext(FeedbackContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** Steps register async validate/save + advance for the footer Next button */
  const footerNextOverrideRef = useRef<(() => Promise<void>) | null>(null);

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
      usesSharedModel: true,
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

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  }, []);

  const handleFooterNext = async () => {
    const run = footerNextOverrideRef.current;
    if (run) {
      await run();
      return;
    }
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

  const handleSave = async (options?: { asDraft?: boolean }) => {
    const asDraft = options?.asDraft !== false;
    try {
      setIsSaving(true);
      
      // Validate that we have at least a story title
      if (!data.story.title.trim()) {
        setMessage('Please enter a story title before saving.');
        setMessageType('warning');
        setShowMessage(true);
        setIsSaving(false);
        return;
      }

      // If dialogues already exist from progressive save, push local camera framing first
      for (const dialogue of data.dialogues) {
        if (typeof dialogue.id !== 'number') {
          continue;
        }
        try {
          await updateDialogue(dialogue.id, {
            camera_orbit: dialogue.camera_orbit,
            camera_target: dialogue.camera_target,
            field_of_view: dialogue.field_of_view,
            zoom_speed: dialogue.zoom_speed,
          });
        } catch (error) {
          console.error('Failed to persist dialogue camera on draft save:', dialogue.id, error);
        }
      }
      
      const storyData = {
        ...data.story,
        title: data.story.title.trim(), // Ensure no leading/trailing spaces
        description: data.story.description.trim() || 'No description provided',
        // Draft = private; Publish = public. Visibility can be changed later in story edit.
        is_public: !asDraft,
      };

      if (typeof data.story.id === 'number') {
        await updateStory(data.story.id, {
          title: storyData.title,
          description: storyData.description,
          is_public: storyData.is_public,
        });
        setData(prev => ({
          ...prev,
          story: { ...prev.story, is_public: storyData.is_public },
        }));
        setMessage(
          asDraft
            ? 'Draft saved successfully! You can continue editing later.'
            : 'Story published successfully! It is now visible to others.'
        );
        setMessageType('success');
        setShowMessage(true);
        await loadStories();
        return;
      }
      
      // Ensure season has a valid release_date and title
      const seasonData = {
        ...data.season,
        title: data.season.title.trim() || 'Season 1',
        release_date: data.season.release_date || '2024-01-01' // Default date if empty
      };
      
      // Ensure episode has a title
      const episodeData = {
        ...data.episode,
        title: data.episode.title.trim() || `Episode 1 of ${storyData.title}`
      };
      
      const result = await apiService.createCompleteStory({
        story: storyData,
        season: seasonData,
        characters: data.characters,
        episode: episodeData,
        dialogues: data.dialogues,
      });

      setMessage(
        asDraft
          ? 'Draft saved successfully! You can continue editing later.'
          : 'Story published successfully! It is now visible to others.'
      );
      setMessageType('success');
      setShowMessage(true);
      
      // Update the data with the saved IDs
      setData(prev => ({ 
        ...prev,
        story: { ...prev.story, id: result.story.id, is_public: storyData.is_public },
        season: { ...prev.season, id: result.season.id },
        episode: { ...prev.episode, id: result.episode.id }
      }));
      
      // Refresh the stories list in the global context so MyStudio shows the new story
      await loadStories();
      
      // Don't navigate - stay on the same page
      // The user can continue editing or navigate manually
    } catch (error: any) {
      console.error('Save error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setMessage(error.message || 'Failed to save. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const registerFooterNext = useCallback((fn: (() => Promise<void>) | null) => {
    footerNextOverrideRef.current = fn;
  }, []);

  // Show loading spinner while checking authentication
  const token = localStorage.getItem('authToken');
  if (!token || !currentUser) {
    return (
      <div className="product-landing story-wizard">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Checking sign-in…" />
          </div>
        </section>
      </div>
    );
  }

  const currentStepComponent = steps[currentStep];
  const StepComponent = currentStepComponent.component;
  const progressPercent = ((currentStep + 1) / steps.length) * 100;
  const stepSharedProps = {
    data,
    onDataUpdate: handleDataUpdate,
    onNext: handleNext,
    onPrevious: handlePrevious,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    onSaveDraft: () => handleSave({ asDraft: true }),
    onPublish: () => handleSave({ asDraft: false }),
    isSaving,
  };

  return (
    <div className="product-landing story-wizard">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container story-wizard__container">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <p className="product-landing__eyebrow">Create</p>
              <h1 className="product-landing__h1 mb-0">New story</h1>
              <p className="product-landing__lead mb-0 mt-2">
                Build your 3D comic step by step. You can save a draft anytime and finish later.
              </p>
            </div>
            <div className="story-wizard__heroActions">
              <BackButton to="/immersivecomics/my-studio/" />
              <SmallButton variant="outline-primary" onClick={() => handleSave({ asDraft: true })} disabled={isSaving}>
                <i className="fas fa-save me-1" aria-hidden />
                {isSaving ? 'Saving…' : 'Save draft'}
              </SmallButton>
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section" style={{ paddingTop: '1.5rem' }}>
        <div className="product-landing__container story-wizard__container">
          <div className="story-wizard__progressMeta">
            <span className="story-wizard__progressCount">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="story-wizard__progressBar" aria-hidden>
              <span className="story-wizard__progressFill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <nav className="story-wizard__stepper" aria-label="Story creation progress">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isClickable = index <= currentStep;
              const stepClass = [
                'story-wizard__step',
                isActive ? 'story-wizard__step--active' : '',
                isCompleted ? 'story-wizard__step--done' : '',
                isClickable ? 'story-wizard__step--clickable' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={step.id}
                  type="button"
                  className={stepClass}
                  onClick={() => isClickable && handleStepClick(index)}
                  disabled={!isClickable}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.shortTitle}${isCompleted ? ', completed' : isActive ? ', current' : ''}`}
                >
                  <span className="story-wizard__stepDot" aria-hidden>
                    {isCompleted ? <i className="fas fa-check" style={{ fontSize: '0.65rem' }} /> : index + 1}
                  </span>
                  <span className="story-wizard__stepLabel">{step.shortTitle}</span>
                </button>
              );
            })}
          </nav>

          <div className="story-wizard__panel" data-step={currentStepComponent.id}>
            <header className="story-wizard__stepHeader">
              <h2 className="story-wizard__stepTitle">{currentStepComponent.title}</h2>
              <p className="story-wizard__stepDescription">{currentStepComponent.description}</p>
            </header>

            <div className="story-wizard__stepContent">
              {isLoading ? (
                <LoadingSpinner />
              ) : STEPS_WITH_FOOTER_NEXT.has(currentStepComponent.id) ? (
                <StepComponent
                  {...stepSharedProps}
                  registerFooterNext={registerFooterNext}
                />
              ) : (
                <StepComponent {...stepSharedProps} />
              )}
            </div>

            <footer className="story-wizard__nav">
              <SmallButton
                variant="outline-secondary"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <i className="fas fa-arrow-left me-1" aria-hidden />
                Previous
              </SmallButton>

              <div className="d-flex gap-2 flex-wrap justify-content-end">
                {currentStep === steps.length - 1 ? (
                  <>
                    <SmallButton
                      variant="outline-primary"
                      onClick={() => handleSave({ asDraft: true })}
                      disabled={isLoading || isSaving}
                    >
                      <i className="fas fa-save me-1" aria-hidden />
                      {isSaving ? 'Saving…' : 'Save draft'}
                    </SmallButton>
                    <SmallButton
                      variant="success"
                      onClick={() => handleSave({ asDraft: false })}
                      disabled={isLoading || isSaving}
                    >
                      <i className="fas fa-rocket me-1" aria-hidden />
                      {isSaving ? 'Publishing…' : 'Publish story'}
                    </SmallButton>
                  </>
                ) : (
                  <SmallButton variant="primary" onClick={() => void handleFooterNext()}>
                    Next
                    <i className="fas fa-arrow-right ms-1" aria-hidden />
                  </SmallButton>
                )}
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoryCreationWizard;
