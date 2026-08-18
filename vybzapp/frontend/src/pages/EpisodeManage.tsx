import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import EpisodeCard from '../components/EpisodeCard';
import DialogueCard from '../components/DialogueCard';
import MetaTags from '../components/MetaTags';
import { useApi } from '../contexts/ApiContext';
import { Episode as ApiEpisode, apiService, Season, Story } from '../services/api';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface Dialogue {
  id: number;
  pov?: number | null; // POV ID (whose view / camera target)
  character: number; // Character ID (who is speaking)
  text: string;
  order: number;
  episode: number;
  scene_title: string;
  scene_description: string;
  shot_type: string;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  rotation: string;
  created_at: string;
  updated_at: string;
}

interface EpisodeFormData {
  title: string;
  episode_number: number;
  description: string;
  summary: string;
  cover_image?: File | null; // File object for uploads
  is_published: boolean;
}

interface DialogueFormData {
  character: number; // Character ID (who is speaking)
  pov: number | null; // POV ID (whose view / camera target)
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
}

const EpisodeManage: React.FC = () => {
  const { seasonId } = useParams<{ seasonId: string }>();
  const { 
    episodes, 
    seasons,
    loadEpisodes, 
    loadDialogues,
    loadSeasons,
    createEpisode, 
    updateEpisode, 
    deleteEpisode,
    createDialogue,
    updateDialogue,
    deleteDialogue,
    characters,
    loadCharacters
  } = useApi();
  
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [showDialogueForm, setShowDialogueForm] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<ApiEpisode | null>(null);
  const [editingDialogue, setEditingDialogue] = useState<Dialogue | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<ApiEpisode | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoadingDialogues, setIsLoadingDialogues] = useState(false);
  const [allDialogues, setAllDialogues] = useState<Dialogue[]>([]);
  
  const [episodeFormData, setEpisodeFormData] = useState<EpisodeFormData>({
    title: '',
    episode_number: 1,
    description: '',
    summary: '',
    cover_image: null,
    is_published: false,
  });
  
  const [dialogueFormData, setDialogueFormData] = useState<DialogueFormData>({
    character: (characters.length > 0 && characters[0].id !== undefined) ? characters[0].id! : 0,
    pov: (characters.length > 0 && characters[0].pov_data?.id != null) ? characters[0].pov_data!.id : null,
    text: '',
    order: 1,
    scene_title: '',
    scene_description: '',
    shot_type: 'mediumShot',
    camera_orbit: '0deg 75deg 3m',
    camera_target: '0m 1.6m 0m',
    field_of_view: 45.0,
    zoom_speed: 1.0,
    rotation: '0deg 0deg 0deg'
  });
  
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  // Find the current season to get the story ID
  const season = seasons.find(s => s.id === parseInt(seasonId || '0'));
  const storyId = season?.comic;

  // Load all necessary data when component mounts
  useEffect(() => {
    const loadAllData = async () => {
      if (seasonId) {
        setIsPageLoading(true);
        
        try {
          // Load episodes first
          await loadEpisodes(parseInt(seasonId));
          
          // If we don't have the current season, load it to get the story ID
          if (!season) {
            try {
              const seasonData = await apiService.getSeason(parseInt(seasonId || '0'));
              setCurrentSeason(seasonData);
              // Load seasons for the story that contains this season
              if (seasonData.comic) {
                await loadSeasons(seasonData.comic);
                // Load characters for the story
                await loadCharacters(seasonData.comic);
                // Load story data for meta tags
                try {
                  const storyData = await apiService.getStory(seasonData.comic);
                  setStory(storyData);
                } catch (error) {
                  console.error('Error loading story data:', error);
                }
              }
            } catch (error) {
              console.error('Error loading season data:', error);
            }
          } else {
            setCurrentSeason(season);
            // If we already have the story ID, load characters and story
            if (storyId) {
              await loadCharacters(storyId);
              // Load story data for meta tags
              try {
                const storyData = await apiService.getStory(storyId);
                setStory(storyData);
              } catch (error) {
                console.error('Error loading story data:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          // Set loading to false after all data is loaded
          setIsPageLoading(false);
        }
      }
    };
    
    loadAllData();
  }, [seasonId, season, storyId, loadEpisodes, loadSeasons, loadCharacters]);
  
  // Helper function to reload all dialogues for all episodes
  const reloadAllDialogues = useCallback(async () => {
    if (seasonId && episodes.length > 0) {
      const seasonEpisodes = episodes.filter(ep => ep.season === parseInt(seasonId));
      if (seasonEpisodes.length > 0) {
        try {
          // Load dialogues for all episodes in parallel using apiService directly
          const dialogueResults = await Promise.all(
            seasonEpisodes.map(async (episode) => {
              try {
                const episodeDialogues = await apiService.getDialogues(episode.id);
                return episodeDialogues;
              } catch (error) {
                console.error(`Error loading dialogues for episode ${episode.id}:`, error);
                return [];
              }
            })
          );
          
          // Flatten and accumulate all dialogues
          const allDialoguesData = dialogueResults.flat();
          setAllDialogues(allDialoguesData);
        } catch (error) {
          console.error('Error loading dialogues for all episodes:', error);
        }
      }
    }
  }, [episodes, seasonId]);

  // Load dialogues for all episodes when episodes are loaded
  useEffect(() => {
    reloadAllDialogues();
  }, [reloadAllDialogues]);
  
  // Filter episodes for this season, chronological by episode number
  const seasonEpisodes = episodes
    .filter(ep => ep.season === parseInt(seasonId || '0'))
    .sort((a, b) => a.episode_number - b.episode_number);
  
  // Filter dialogues for selected episode
  const episodeDialogues = selectedEpisode 
    ? allDialogues.filter(d => d.episode === selectedEpisode.id)
    : [];

  const handleEpisodeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEpisodeFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'episode_number'
            ? parseInt(value) || 1
            : value
    }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEpisodeFormData(prev => ({
      ...prev,
      cover_image: file
    }));
  };

  const handleDialogueInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDialogueFormData(prev => {
      const charId = name === 'character' ? parseInt(value) || 0 : prev.character;
      const selectedChar = name === 'character' ? characters.find(c => c.id === charId) : null;
      return {
        ...prev,
        [name]: name === 'order' ? parseInt(value) || 1 :
                name === 'character' ? charId :
                name === 'pov' ? (value === '' ? null : parseInt(value, 10)) :
                name === 'field_of_view' ? parseFloat(value) || 45.0 :
                name === 'zoom_speed' ? parseFloat(value) || 1.0 :
                value,
        ...(name === 'character' ? { pov: selectedChar?.pov_data?.id ?? null } : {})
      };
    });
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!seasonId) {
      setMessage('Season ID is required');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    try {
      if (editingEpisode) {
        await updateEpisode(editingEpisode.id, episodeFormData as Partial<ApiEpisode>);
        setMessage('Episode updated successfully!');
      } else {
        await createEpisode(parseInt(seasonId), episodeFormData as Partial<ApiEpisode>);
        setMessage('Episode created successfully!');
      }
      
      setMessageType('success');
      setShowMessage(true);
      resetEpisodeForm();
      
      // Reload episodes
      await loadEpisodes(parseInt(seasonId));
    } catch (error: any) {
      setMessage(error.message || 'Failed to save episode');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleDialogueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEpisode) {
      setMessage('Please select an episode first');
      setMessageType('warning');
      setShowMessage(true);
      return;
    }

    try {
      const payload = { ...dialogueFormData, pov: dialogueFormData.pov ?? undefined };
      if (editingDialogue) {
        await updateDialogue(editingDialogue.id, payload);
        setMessage('Dialogue updated successfully!');
      } else {
        await createDialogue(selectedEpisode.id, payload);
        setMessage('Dialogue created successfully!');
      }
      
      setMessageType('success');
      setShowMessage(true);
      resetDialogueForm();
      
      // Reload all dialogues for all episodes
      await reloadAllDialogues();
    } catch (error: any) {
      setMessage(error.message || 'Failed to save dialogue');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleEditEpisode = (episode: ApiEpisode) => {
    setEditingEpisode(episode);
    setEpisodeFormData({
      title: episode.title,
      episode_number: episode.episode_number,
      description: episode.description,
      summary: episode.summary || '',
      cover_image: null, // Reset cover image for editing
      is_published: !!episode.is_published,
    });
    setShowEpisodeForm(true);
  };

  /** Strip TinyMCE/admin HTML so the edit textarea shows plain text. */
  const stripHtmlForEdit = (raw: string): string => {
    if (!raw || typeof raw !== 'string') return '';
    const withNewlines = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = withNewlines;
      const out = (div.textContent ?? div.innerText ?? withNewlines).trim();
      return out.replace(/\n{3,}/g, '\n\n');
    }
    return withNewlines.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  };

  const handleEditDialogue = (dialogue: Dialogue) => {
    setEditingDialogue(dialogue);
    setDialogueFormData({
      character: dialogue.character,
      pov: dialogue.pov ?? null,
      text: stripHtmlForEdit(dialogue.text),
      order: dialogue.order,
      scene_title: dialogue.scene_title,
      scene_description: dialogue.scene_description,
      shot_type: dialogue.shot_type,
      camera_orbit: dialogue.camera_orbit,
      camera_target: dialogue.camera_target,
      field_of_view: dialogue.field_of_view,
      zoom_speed: dialogue.zoom_speed,
      rotation: dialogue.rotation
    });
    setShowDialogueForm(true);
  };

  const handleDeleteEpisode = async (episodeId: number) => {
    if (window.confirm('Are you sure you want to delete this episode? This will also delete all dialogues.')) {
      try {
        await deleteEpisode(episodeId);
        setMessage('Episode deleted successfully!');
        setMessageType('success');
        setShowMessage(true);
        
        // Reload episodes
        if (seasonId) {
          await loadEpisodes(parseInt(seasonId));
        }
        
        // Clear selected episode if it was deleted
        if (selectedEpisode?.id === episodeId) {
          setSelectedEpisode(null);
        }
      } catch (error: any) {
        setMessage(error.message || 'Failed to delete episode');
        setMessageType('danger');
        setShowMessage(true);
      }
    }
  };

  const handleDeleteDialogue = async (dialogueId: number) => {
    if (window.confirm('Are you sure you want to delete this dialogue?')) {
      try {
        await deleteDialogue(dialogueId);
        setMessage('Dialogue deleted successfully!');
        setMessageType('success');
        setShowMessage(true);
        
        // Reload all dialogues for all episodes
        await reloadAllDialogues();
      } catch (error: any) {
        setMessage(error.message || 'Failed to delete dialogue');
        setMessageType('danger');
        setShowMessage(true);
      }
    }
  };

  const resetEpisodeForm = () => {
    setEpisodeFormData({
      title: '',
      episode_number: 1,
      description: '',
      summary: '',
      cover_image: null,
      is_published: false,
    });
    setEditingEpisode(null);
    setShowEpisodeForm(false);
  };

  const resetDialogueForm = () => {
    setDialogueFormData({
      character: (characters.length > 0 && characters[0].id !== undefined) ? characters[0].id! : 0,
      pov: (characters.length > 0 && characters[0].pov_data?.id != null) ? characters[0].pov_data!.id : null,
      text: '',
      order: 1,
      scene_title: '',
      scene_description: '',
      shot_type: 'mediumShot',
      camera_orbit: '0deg 75deg 3m',
      camera_target: '0m 1.6m 0m',
      field_of_view: 45.0,
      zoom_speed: 1.0,
      rotation: '0deg 0deg 0deg'
    });
    setEditingDialogue(null);
    setShowDialogueForm(false);
  };

  const episodeFormDialogRef = useDialogA11y(showEpisodeForm, resetEpisodeForm);
  const dialogueFormDialogRef = useDialogA11y(showDialogueForm, resetDialogueForm);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleEpisodeSelect = async (episode: ApiEpisode) => {
    setSelectedEpisode(episode);
    setIsLoadingDialogues(true);
    try {
      await loadDialogues(episode.id);
    } catch (error) {
      console.error('Error loading dialogues:', error);
    } finally {
      setIsLoadingDialogues(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading episodes…" />
          </div>
        </section>
      </div>
    );
  }

  const resolvedStoryId = story?.id ?? currentSeason?.comic ?? season?.comic;
  const displaySeason = currentSeason || season;

  // Get season image for meta tags - use first episode cover image, or story cover image, or default
  const getSeasonImage = (): string | undefined => {
    if (seasonEpisodes.length > 0 && seasonEpisodes[0].cover_image) {
      const coverImage = seasonEpisodes[0].cover_image;
      if (typeof coverImage === 'string') {
        return coverImage.startsWith('http') ? coverImage : `https://www.justvybz.com${coverImage}`;
      }
    }
    // Fallback to story cover image
    if (story?.comic_image) {
      const comicImage = story.comic_image;
      if (typeof comicImage === 'string') {
        return comicImage.startsWith('http') ? comicImage : `https://www.justvybz.com${comicImage}`;
      }
    }
    return undefined; // Will use default from MetaTags component
  };

  // Get season title and description for meta tags
  const seasonTitle = displaySeason
    ? `Season ${displaySeason.season_number}: ${displaySeason.title}${story ? ` - ${story.title}` : ''}`
    : 'Season';
  const seasonDescription =
    displaySeason?.description || story?.description || 'Explore episodes and dialogues for this season';

  return (
    <div className="product-landing">
      <MetaTags
        title={seasonTitle}
        description={seasonDescription}
        keywords={`3D comics, ${displaySeason?.title || ''}, ${story?.title || ''}, interactive stories, immersive comics`}
        image={getSeasonImage()}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="article"
      />
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={4000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container" style={{ maxWidth: '1200px' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p className="product-landing__eyebrow">Season</p>
              <h1 className="product-landing__h1 mb-0">Episodes</h1>
              <p className="product-landing__lead mb-0 mt-2">
                {displaySeason
                  ? `Season ${displaySeason.season_number}: ${displaySeason.title}`
                  : 'This season'}
                {story?.title ? ` · ${story.title}` : ''}
              </p>
            </div>
            <div className="episode-manage__heroActions">
              <button
                type="button"
                className="stories-landing__btnPrimary"
                onClick={() => setShowEpisodeForm(true)}
              >
                <i className="fas fa-plus me-2" aria-hidden />
                Add episode
              </button>
              {resolvedStoryId && (
                <>
                  <Link
                    to={`/immersivecomics/story/${resolvedStoryId}/edit/`}
                    className="product-landing__ctaGhost text-decoration-none d-inline-flex align-items-center"
                  >
                    <i className="fas fa-book me-2" aria-hidden />
                    Edit story
                  </Link>
                  <Link
                    to={`/immersivecomics/story/${resolvedStoryId}/characters/`}
                    className="product-landing__ctaGhost text-decoration-none d-inline-flex align-items-center"
                  >
                    <i className="fas fa-users me-2" aria-hidden />
                    Characters
                  </Link>
                </>
              )}
              {seasonId && (
                <Link
                  to={`/immersivecomics/season/${seasonId}/edit/`}
                  className="product-landing__ctaGhost text-decoration-none d-inline-flex align-items-center"
                >
                  <i className="fas fa-sliders-h me-2" aria-hidden />
                  Edit season
                </Link>
              )}
              <BackButton
                to={
                  resolvedStoryId
                    ? `/immersivecomics/story/${resolvedStoryId}/manage/`
                    : '/immersivecomics/'
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container px-2 px-md-3 pb-4" style={{ maxWidth: '1200px' }}>
          <div className="story-manage__layout">
            <div className="my-studio__panel">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-film" aria-hidden />
                  <span className="my-studio__panelTitleText">Episodes ({seasonEpisodes.length})</span>
                </h2>
                <div className="my-studio__panelHeadActions">
                  <button
                    type="button"
                    className="stories-landing__btnPrimary"
                    onClick={() => setShowEpisodeForm(true)}
                  >
                    <i className="fas fa-plus me-2" aria-hidden />
                    New
                  </button>
                </div>
              </div>
              <div className="my-studio__panelBody episode-manage__panelScroll p-2">
                {seasonEpisodes.length === 0 ? (
                  <div className="story-manage__inlineEmpty py-3">
                    <div className="stories-landing__emptyIcon" aria-hidden>
                      <i className="fas fa-video" />
                    </div>
                    <p className="product-landing__body mb-2" style={{ fontSize: '0.9rem' }}>
                      No episodes yet. Create one to add dialogues and scenes.
                    </p>
                    <button type="button" className="stories-landing__btnPrimary" onClick={() => setShowEpisodeForm(true)}>
                      <i className="fas fa-plus me-2" aria-hidden />
                      Create first episode
                    </button>
                  </div>
                ) : (
                  <div>
                    {seasonEpisodes.map((episode) => {
                      const episodeDialogueCount = allDialogues.filter((d) => d.episode === episode.id).length;
                      return (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode as ApiEpisode}
                          onEdit={handleEditEpisode}
                          onDelete={handleDeleteEpisode}
                          onSelect={handleEpisodeSelect}
                          isSelected={selectedEpisode?.id === episode.id}
                          showActions={true}
                          dialogueCount={episodeDialogueCount}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="my-studio__panel">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-comments" aria-hidden />
                  <span className="my-studio__panelTitleText">
                    Dialogues
                    {selectedEpisode ? ` · ${selectedEpisode.title}` : ''}
                  </span>
                </h2>
                {selectedEpisode && (
                  <div className="my-studio__panelHeadActions">
                    <button
                      type="button"
                      className="stories-landing__btnPrimary"
                      onClick={() => setShowDialogueForm(true)}
                    >
                      <i className="fas fa-plus me-2" aria-hidden />
                      Add
                    </button>
                  </div>
                )}
              </div>
              <div className="my-studio__panelBody episode-manage__panelScroll p-2">
                {!selectedEpisode ? (
                  <div className="story-manage__inlineEmpty py-4">
                    <div className="stories-landing__emptyIcon" aria-hidden>
                      <i className="fas fa-hand-pointer" />
                    </div>
                    <p className="product-landing__body mb-0" style={{ fontSize: '0.9rem' }}>
                      Select an episode on the left to view and edit its dialogues.
                    </p>
                  </div>
                ) : isLoadingDialogues ? (
                  <div className="text-center py-4">
                    <LoadingSpinner message="Loading dialogues…" />
                  </div>
                ) : episodeDialogues.length === 0 ? (
                  <div className="story-manage__inlineEmpty py-3">
                    <div className="stories-landing__emptyIcon" aria-hidden>
                      <i className="fas fa-comment-dots" />
                    </div>
                    <p className="product-landing__body mb-2" style={{ fontSize: '0.9rem' }}>
                      No dialogues for this episode yet.
                    </p>
                    <button type="button" className="stories-landing__btnPrimary" onClick={() => setShowDialogueForm(true)}>
                      <i className="fas fa-plus me-2" aria-hidden />
                      Add first dialogue
                    </button>
                  </div>
                ) : (
                  <div>
                    {episodeDialogues
                      .sort((a, b) => a.order - b.order)
                      .map((dialogue) => (
                        <DialogueCard
                          key={dialogue.id}
                          dialogue={dialogue}
                          characters={characters}
                          onEdit={handleEditDialogue}
                          onDelete={handleDeleteDialogue}
                          showActions={true}
                          showCameraInfo={true}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showEpisodeForm && (
        <div
          className="my-studio__modal my-studio__modal--scrollForm modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetEpisodeForm();
          }}
        >
          <div className="modal-dialog modal-dialog-scrollable">
            <div
              className="modal-content"
              ref={episodeFormDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="episode-form-modal-title"
              tabIndex={-1}
            >
              <div className="modal-header">
                <h5 id="episode-form-modal-title" className="subtext-btn mb-0">
                  {editingEpisode ? 'Edit Episode' : 'Add New Episode'}
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-light border"
                  onClick={resetEpisodeForm}
                  aria-label="Close"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
              <form onSubmit={handleEpisodeSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="episodeTitle" className="form-label subtext-btn-sm">Episode Title</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      id="episodeTitle"
                      name="title"
                      value={episodeFormData.title}
                      onChange={handleEpisodeInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="episodeNumber" className="form-label subtext-btn-sm">Episode Number</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      id="episodeNumber"
                      name="episode_number"
                      value={episodeFormData.episode_number}
                      onChange={handleEpisodeInputChange}
                      min="1"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="episodeDescription" className="form-label subtext-btn-sm">Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      id="episodeDescription"
                      name="description"
                      rows={3}
                      value={episodeFormData.description}
                      onChange={handleEpisodeInputChange}
                      required
                    />
                    <small className="text-muted">
                      Shown before dialogues when viewers start the episode.
                    </small>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="episodeSummary" className="form-label subtext-btn-sm">Summary</label>
                    <textarea
                      className="form-control form-control-sm"
                      id="episodeSummary"
                      name="summary"
                      rows={3}
                      value={episodeFormData.summary}
                      onChange={handleEpisodeInputChange}
                      placeholder="Closing text after the last dialogue (optional)"
                    />
                    <small className="text-muted">
                      Shown after the final dialogue for episode closure.
                    </small>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="episodeCoverImage" className="form-label subtext-btn-sm">Cover Image</label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      id="episodeCoverImage"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                    />
                    {episodeFormData.cover_image && (
                      <div className="mt-2">
                        <small className="text-muted">Selected: {episodeFormData.cover_image.name}</small>
                      </div>
                    )}
                    {editingEpisode && editingEpisode.cover_image && typeof editingEpisode.cover_image === 'string' && !episodeFormData.cover_image && (
                      <div className="mt-2">
                        <small className="text-muted">Current: {editingEpisode.cover_image}</small>
                      </div>
                    )}
                  </div>
                  <div className="mb-1">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="episodeIsPublished"
                        name="is_published"
                        checked={episodeFormData.is_published}
                        onChange={handleEpisodeInputChange}
                      />
                      <label className="form-check-label subtext-btn-sm" htmlFor="episodeIsPublished">
                        Publish episode (visible on public stories)
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer gap-2 d-flex flex-wrap justify-content-end">
                  <button type="button" className="product-landing__ctaGhost" onClick={resetEpisodeForm}>
                    Cancel
                  </button>
                  <button type="submit" className="stories-landing__btnPrimary">
                    {editingEpisode ? 'Update episode' : 'Create episode'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDialogueForm && selectedEpisode && (
        <div
          className="my-studio__modal my-studio__modal--scrollForm modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetDialogueForm();
          }}
        >
          <div className="modal-dialog modal-dialog-scrollable modal-lg">
            <div
              className="modal-content"
              ref={dialogueFormDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialogue-form-modal-title"
              tabIndex={-1}
            >
              <div className="modal-header">
                <h5 id="dialogue-form-modal-title" className="subtext-btn mb-0">
                  {editingDialogue ? 'Edit Dialogue' : 'Add New Dialogue'}
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-light border"
                  onClick={resetDialogueForm}
                  aria-label="Close"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
              <form onSubmit={handleDialogueSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="dialogueCharacter" className="form-label subtext-btn-sm">Character</label>&nbsp;
                    <select
                      className="form-select form-select-sm"
                      id="dialogueCharacter"
                      name="character"
                      value={dialogueFormData.character}
                      onChange={handleDialogueInputChange}
                      required
                    >
                      <option value="">Select a character</option>
                      {characters.map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="dialoguePov" className="form-label subtext-btn-sm">POV (Target character) </label>&nbsp;
                    <select
                      className="form-select form-select-sm"
                      id="dialoguePov"
                      name="pov"
                      value={dialogueFormData.pov ?? ''}
                      onChange={handleDialogueInputChange}
                    >
                      <option value="">— Select POV —</option>
                      {(() => {
                        const fromCharacters = characters
                          .filter(c => c.pov_data?.id != null)
                          .map(c => ({ value: c.pov_data!.id, label: c.name }));
                        const currentPovId = editingDialogue?.pov ?? dialogueFormData.pov;
                        const hasCurrent = currentPovId != null && fromCharacters.some(o => o.value === currentPovId);
                        if (currentPovId != null && !hasCurrent) {
                          const charName = characters.find(c => c.id === (editingDialogue?.character ?? dialogueFormData.character))?.name ?? 'Character';
                          fromCharacters.push({ value: currentPovId, label: `${charName}'s POV` });
                        }
                        return fromCharacters.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ));
                      })()}
                    </select>
                    <small className="text-muted">Whose view the camera targets (character head position)</small>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="dialogueText" className="form-label subtext-btn-sm">Dialogue Text</label>
                    <textarea
                      className="form-control form-control-sm"
                      id="dialogueText"
                      name="text"
                      rows={3}
                      value={dialogueFormData.text}
                      onChange={handleDialogueInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="dialogueOrder" className="form-label subtext-btn-sm">Order</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      id="dialogueOrder"
                      name="order"
                      value={dialogueFormData.order}
                      onChange={handleDialogueInputChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  {/* Scene Information */}
                  <div className="mb-3">
                    <label htmlFor="dialogueSceneTitle" className="form-label subtext-btn-sm">Scene Title</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      id="dialogueSceneTitle"
                      name="scene_title"
                      value={dialogueFormData.scene_title}
                      onChange={handleDialogueInputChange}
                      placeholder="Enter scene title"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="dialogueSceneDescription" className="form-label subtext-btn-sm">Scene Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      id="dialogueSceneDescription"
                      name="scene_description"
                      rows={2}
                      value={dialogueFormData.scene_description}
                      onChange={handleDialogueInputChange}
                      placeholder="Describe the scene"
                    />
                  </div>
              
                  
                  {/* Camera Controls — collapsed by default to save space on small screens */}
                  <details
                    className="episode-manage__cameraDetails mb-3"
                    open={!!editingDialogue}
                  >
                    <summary className="form-label subtext-btn-sm mb-0">Camera controls</summary>
                    <div className="mt-2">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label htmlFor="dialogueCameraOrbit" className="form-label subtext-btn-sm">Camera Orbit</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            id="dialogueCameraOrbit"
                            name="camera_orbit"
                            value={dialogueFormData.camera_orbit}
                            onChange={handleDialogueInputChange}
                            placeholder="0deg 75deg 3m"
                          />
                          <small className="text-muted">Format: azimuth deg polar deg distance</small>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="dialogueCameraTarget" className="form-label subtext-btn-sm">Camera Target</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            id="dialogueCameraTarget"
                            name="camera_target"
                            value={dialogueFormData.camera_target}
                            onChange={handleDialogueInputChange}
                            placeholder="0m 1.6m 0m"
                          />
                          <small className="text-muted">Format: x y z coordinates</small>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label htmlFor="dialogueRotation" className="form-label subtext-btn-sm">Rotation</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="dialogueRotation"
                          name="rotation"
                          value={dialogueFormData.rotation}
                          onChange={handleDialogueInputChange}
                          placeholder="0deg 0deg 0deg"
                        />
                        <small className="text-muted">Format: x y z rotation in degrees</small>
                      </div>
                    </div>
                  </details>
                </div>
                <div className="modal-footer gap-2 d-flex flex-wrap justify-content-end">
                  <button type="button" className="product-landing__ctaGhost" onClick={resetDialogueForm}>
                    Cancel
                  </button>
                  <button type="submit" className="stories-landing__btnPrimary">
                    {editingDialogue ? 'Update dialogue' : 'Create dialogue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodeManage;
