import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import EpisodeCard from '../components/EpisodeCard';
import DialogueCard from '../components/DialogueCard';
import MetaTags from '../components/MetaTags';
import { useApi } from '../contexts/ApiContext';
import { Episode as ApiEpisode, apiService, Season, Story } from '../services/api';

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
  cover_image?: File | null; // File object for uploads
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
    cover_image: null
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
          console.log(`Loaded ${allDialoguesData.length} total dialogues for ${seasonEpisodes.length} episodes`);
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
  
  // Filter episodes for this season
  const seasonEpisodes = episodes.filter(ep => ep.season === parseInt(seasonId || '0'));
  
  // Filter dialogues for selected episode
  const episodeDialogues = selectedEpisode 
    ? allDialogues.filter(d => d.episode === selectedEpisode.id)
    : [];

  const handleEpisodeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEpisodeFormData(prev => ({
      ...prev,
      [name]: name === 'episode_number' ? parseInt(value) || 1 : value
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
      cover_image: null // Reset cover image for editing
    });
    setShowEpisodeForm(true);
  };

  const handleEditDialogue = (dialogue: Dialogue) => {
    setEditingDialogue(dialogue);
    setDialogueFormData({
      character: dialogue.character,
      pov: dialogue.pov ?? null,
      text: dialogue.text,
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
      cover_image: null
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
    return <LoadingSpinner message="Loading episodes..." />;
  }

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
  const seasonTitle = currentSeason 
    ? `Season ${currentSeason.season_number}: ${currentSeason.title}${story ? ` - ${story.title}` : ''}`
    : 'Season';
  const seasonDescription = currentSeason?.description || story?.description || 'Explore episodes and dialogues for this season';

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <MetaTags
        title={seasonTitle}
        description={seasonDescription}
        keywords={`3D comics, ${currentSeason?.title || ''}, ${story?.title || ''}, interactive stories, immersive comics`}
        image={getSeasonImage()}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="article"
      />
      <PageHeader
        title="Episode Management"
        description="Create and manage episodes and dialogues for your season"
        actions={
          <>
            <SmallButton 
              variant="primary" 
              onClick={() => setShowEpisodeForm(true)}
            >
              <i className="fas fa-plus me-1"></i>Add Episode
            </SmallButton>
            <BackButton to={storyId ? `/immersivecomics/story/${storyId}/manage/` : "/immersivecomics/"} />
          </>
        }
      />

      <div className="row">
        {/* Episodes Column */}
        <div className="col-md-6">
          <div className="card p-0">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="subtext-btn mb-0">Episodes ({seasonEpisodes.length})</h5>
              <SmallButton 
                variant="outline-primary" 
                onClick={() => setShowEpisodeForm(true)}
              >
                <i className="fas fa-plus me-1"></i>New Episode
              </SmallButton>
            </div>
            <div className="card-body p-1" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {seasonEpisodes.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-video fa-3x text-muted mb-3"></i>
                  <p className="subtext-btn-sm text-muted">No episodes created yet</p>
                  <SmallButton variant="primary" onClick={() => setShowEpisodeForm(true)}>
                    <i className="fas fa-plus me-1"></i>Create First Episode
                  </SmallButton>
                </div>
              ) : (
                <div>
                  {seasonEpisodes.map(episode => {
                    const episodeDialogueCount = allDialogues.filter(d => d.episode === episode.id).length;
                    console.log(`Episode ${episode.id} (${episode.title}): ${episodeDialogueCount} dialogues`);
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
        </div>

        {/* Dialogues Column */}
        <div className="col-md-6 mt-2">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center p-1">
              <h5 className="subtext-btn mb-0">
                Dialogues {selectedEpisode ? `- ${selectedEpisode.title}` : ''}
              </h5>
              {selectedEpisode && (
                <SmallButton 
                  variant="outline-primary" 
                  onClick={() => setShowDialogueForm(true)}
                >
                  <i className="fas fa-plus me-3"></i>
                </SmallButton>
              )}
            </div>
            <div className="card-body p-1" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {!selectedEpisode ? (
                <div className="text-center py-4">
                  <i className="fas fa-comments fa-3x text-muted mb-3"></i>
                  <p className="subtext-btn-sm text-muted">Select an episode to manage dialogues</p>
                </div>
              ) : isLoadingDialogues ? (
                <div className="text-center py-4">
                  <LoadingSpinner message="Loading dialogues..." />
                </div>
              ) : episodeDialogues.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-comment fa-3x text-muted mb-3"></i>
                  <p className="subtext-btn-sm text-muted">No dialogues for this episode</p>
                  <SmallButton variant="primary" onClick={() => setShowDialogueForm(true)}>
                    <i className="fas fa-plus me-1"></i>Add First Dialogue
                  </SmallButton>
                </div>
              ) : (
                <div>
                  {episodeDialogues
                    .sort((a, b) => a.order - b.order)
                    .map(dialogue => (
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

      {/* Episode Form Modal */}
      {showEpisodeForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="subtext-btn mb-0">
                  {editingEpisode ? 'Edit Episode' : 'Add New Episode'}
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-light border"
                  onClick={resetEpisodeForm}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
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
                </div>
                <div className="modal-footer">
                  <SmallButton type="button" variant="outline-secondary" onClick={resetEpisodeForm}>
                    Cancel
                  </SmallButton>
                  <SmallButton type="submit" variant="primary">
                    {editingEpisode ? 'Update Episode' : 'Create Episode'}
                  </SmallButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue Form Modal */}
      {showDialogueForm && selectedEpisode && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="subtext-btn mb-0">
                  {editingDialogue ? 'Edit Dialogue' : 'Add New Dialogue'}
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-light border"
                  onClick={resetDialogueForm}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleDialogueSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="dialogueCharacter" className="form-label subtext-btn-sm">Character</label>
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
                    <label htmlFor="dialoguePov" className="form-label subtext-btn-sm">POV (Camera target character)</label>
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
              
                  
                  {/* Camera Controls */}
                  <div className="mb-3">
                    <label className="form-label subtext-btn-sm">Camera Controls</label>
                    <div className="row">
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
                  </div>
                  

                  
                  <div className="mb-3">
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
                <div className="modal-footer">
                  <SmallButton type="button" variant="outline-secondary" onClick={resetDialogueForm}>
                    Cancel
                  </SmallButton>
                  <SmallButton type="submit" variant="primary">
                    {editingDialogue ? 'Update Dialogue' : 'Create Dialogue'}
                  </SmallButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Message Popup */}
      {showMessage && (
        <MessagePopup
          message={message}
          type={messageType}
          show={showMessage}
          onClose={handleCloseMessage}
        />
      )}
    </div>
  );
};

export default EpisodeManage;
