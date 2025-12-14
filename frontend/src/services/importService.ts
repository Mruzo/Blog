/**
 * Import Service for Django Story Data
 * 
 * This service handles importing story data from Django export JSON files
 * into the React app's API structure.
 */

import { apiService } from './api';

export interface DjangoExportData {
  export_info: {
    exported_at: string;
    total_comics: number;
    include_unpublished: boolean;
    version: string;
  };
  comics: DjangoComicData[];
}

export interface DjangoCharacterData {
  id: number;
  name: string;
  personality: string;
  love_interest: string;
  bio: string;
  model_file: string | null;
}

export interface DjangoComicData {
  id: number;
  title: string;
  description: string;
  seasons: DjangoSeasonData[];
  characters?: DjangoCharacterData[]; // Optional for backward compatibility
}

export interface DjangoSeasonData {
  id: number;
  season_number: number;
  title: string;
  description: string;
  release_date: string | null;
  episodes: DjangoEpisodeData[];
}

export interface DjangoEpisodeData {
  id: number;
  episode_number: number;
  title: string;
  description: string;
  is_published: boolean;
  summary: string;
  summary_camera_orbit?: string;
  summary_field_of_view?: number;
  view_count: number;
  last_viewed: string | null;
  dialogues: DjangoDialogueData[];
}

export interface DjangoDialogueData {
  id: number;
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
  pov?: {
    id: number;
    title: string;
    character: {
      id: number;
      name: string;
      personality: string;
      love_interest: string;
      bio: string;
    };
    head_x: number;
    head_y: number;
    head_z: number;
    default_camera_target: string;
  };
}

export interface ImportProgress {
  currentStep: string;
  progress: number;
  total: number;
  completed: number;
  errors: string[];
}

export class ImportService {
  private progressCallback?: (progress: ImportProgress) => void;

  constructor(progressCallback?: (progress: ImportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Import Django export data into React app
   */
  async importDjangoData(exportData: DjangoExportData): Promise<void> {
    const progress: ImportProgress = {
      currentStep: 'Starting import...',
      progress: 0,
      total: 0,
      completed: 0,
      errors: []
    };

    try {
      // Calculate total steps
      const totalComics = exportData.comics.length;
      let totalSteps = totalComics; // Stories
      
      for (const comic of exportData.comics) {
        // Add characters count
        if (comic.characters) {
          totalSteps += comic.characters.length;
        }
        totalSteps += comic.seasons.length; // Seasons
        for (const season of comic.seasons) {
          totalSteps += season.episodes.length; // Episodes
          for (const episode of season.episodes) {
            totalSteps += episode.dialogues.length; // Dialogues
          }
        }
      }

      progress.total = totalSteps;
      this.updateProgress(progress);

      // Import each comic
      for (const comicData of exportData.comics) {
        await this.importComic(comicData, progress);
      }

      progress.currentStep = 'Import completed successfully!';
      progress.progress = 100;
      this.updateProgress(progress);

    } catch (error: any) {
      // Extract detailed error message from backend
      let errorMessage = error.message || 'Unknown error';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // Format validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]: [string, any]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          if (errorMessages) {
            errorMessage = errorMessages;
          }
        }
      }
      progress.errors.push(`Import failed: ${errorMessage}`);
      this.updateProgress(progress);
      throw error;
    }
  }

  /**
   * Import a single comic with all its data
   */
  private async importComic(comicData: DjangoComicData, progress: ImportProgress): Promise<void> {
    try {
      progress.currentStep = `Importing story: ${comicData.title}`;
      this.updateProgress(progress);

      // Create story
      const story = await apiService.createStory({
        title: comicData.title,
        description: comicData.description,
        is_public: true // Imported stories are public by default
      });

      progress.completed++;
      progress.progress = (progress.completed / progress.total) * 100;
      this.updateProgress(progress);

      // Import characters first (needed for dialogues)
      const characterMap = new Map<number, number>(); // Maps old ID -> new ID
      
      if (comicData.characters && comicData.characters.length > 0) {
        for (const characterData of comicData.characters) {
          const newCharacter = await this.importCharacter(story.id, characterData, progress);
          characterMap.set(characterData.id, newCharacter.id);
        }
      }

      // Import seasons
      for (const seasonData of comicData.seasons) {
        await this.importSeason(story.id, seasonData, progress, characterMap);
      }

    } catch (error: any) {
      // Extract detailed error message from backend
      let errorMessage = error.message || 'Unknown error';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // Format validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]: [string, any]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          if (errorMessages) {
            errorMessage = errorMessages;
          }
        }
      }
      progress.errors.push(`Failed to import story ${comicData.title}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Import a single character
   */
  private async importCharacter(storyId: number, characterData: DjangoCharacterData, progress: ImportProgress): Promise<any> {
    try {
      progress.currentStep = `Importing character: ${characterData.name}`;
      this.updateProgress(progress);

      // Create character
      const character = await apiService.createCharacter(storyId, {
        name: characterData.name,
        personality: characterData.personality || '',
        love_interest: characterData.love_interest || '',
        bio: characterData.bio || ''
        // Note: model_file would need to be handled separately for file uploads
      });

      progress.completed++;
      progress.progress = (progress.completed / progress.total) * 100;
      this.updateProgress(progress);

      return character;

    } catch (error: any) {
      progress.errors.push(`Failed to import character ${characterData.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import a single season with all its data
   */
  private async importSeason(storyId: number, seasonData: DjangoSeasonData, progress: ImportProgress, characterMap: Map<number, number>): Promise<void> {
    try {
      progress.currentStep = `Importing season: ${seasonData.title}`;
      this.updateProgress(progress);

      // Create season
      const season = await apiService.createSeason(storyId, {
        title: seasonData.title,
        season_number: seasonData.season_number,
        description: seasonData.description,
        release_date: seasonData.release_date || new Date().toISOString().split('T')[0]
      });

      progress.completed++;
      progress.progress = (progress.completed / progress.total) * 100;
      this.updateProgress(progress);

      // Import episodes
      for (const episodeData of seasonData.episodes) {
        await this.importEpisode(season.id, episodeData, progress, characterMap);
      }

    } catch (error: any) {
      progress.errors.push(`Failed to import season ${seasonData.title}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import a single episode with all its data
   */
  private async importEpisode(seasonId: number, episodeData: DjangoEpisodeData, progress: ImportProgress, characterMap: Map<number, number>): Promise<void> {
    try {
      progress.currentStep = `Importing episode: ${episodeData.title}`;
      this.updateProgress(progress);

      // Create episode
      const episode = await apiService.createEpisode(seasonId, {
        title: episodeData.title,
        episode_number: episodeData.episode_number,
        description: episodeData.description,
        summary: episodeData.summary,
        is_published: episodeData.is_published
      });

      progress.completed++;
      progress.progress = (progress.completed / progress.total) * 100;
      this.updateProgress(progress);

      // Import dialogues
      for (const dialogueData of episodeData.dialogues) {
        await this.importDialogue(episode.id, dialogueData, progress, characterMap);
      }

    } catch (error: any) {
      progress.errors.push(`Failed to import episode ${episodeData.title}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import a single dialogue
   */
  private async importDialogue(episodeId: number, dialogueData: DjangoDialogueData, progress: ImportProgress, characterMap: Map<number, number>): Promise<void> {
    try {
      progress.currentStep = `Importing dialogue: ${dialogueData.text.substring(0, 50)}...`;
      this.updateProgress(progress);

      // Get the correct character ID from the character map
      let characterId = 1; // Default fallback
      
      if (dialogueData.pov?.character?.id) {
        // Map old character ID to new character ID
        const mappedCharacterId = characterMap.get(dialogueData.pov.character.id);
        if (mappedCharacterId) {
          characterId = mappedCharacterId;
        } else {
          // Character not found in map, try to find by name
          // This is a fallback for dialogues that reference characters not in the top-level characters array
          console.warn(`Character ID ${dialogueData.pov.character.id} not found in character map, using default`);
        }
      }

      // Create dialogue
      await apiService.createDialogue(episodeId, {
        character: characterId,
        text: dialogueData.text,
        order: dialogueData.order,
        scene_title: dialogueData.scene_title,
        scene_description: dialogueData.scene_description,
        shot_type: dialogueData.shot_type,
        camera_orbit: dialogueData.camera_orbit,
        camera_target: dialogueData.camera_target,
        field_of_view: dialogueData.field_of_view,
        zoom_speed: dialogueData.zoom_speed,
        rotation: dialogueData.rotation
      });

      progress.completed++;
      progress.progress = (progress.completed / progress.total) * 100;
      this.updateProgress(progress);

    } catch (error: any) {
      progress.errors.push(`Failed to import dialogue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(progress: ImportProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Validate Django export data before import
   */
  static validateExportData(data: any): data is DjangoExportData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.export_info || !data.comics || !Array.isArray(data.comics)) {
      return false;
    }

    // Validate each comic
    for (const comic of data.comics) {
      if (!comic.title || !comic.description || !Array.isArray(comic.seasons)) {
        return false;
      }

      // Validate characters if present
      if (comic.characters && Array.isArray(comic.characters)) {
        for (const character of comic.characters) {
          if (!character.name) {
            return false;
          }
        }
      }

      // Validate each season
      for (const season of comic.seasons) {
        if (!season.title || !season.season_number || !Array.isArray(season.episodes)) {
          return false;
        }

        // Validate each episode
        for (const episode of season.episodes) {
          if (!episode.title || !Array.isArray(episode.dialogues)) {
            return false;
          }

          // Validate each dialogue
          for (const dialogue of episode.dialogues) {
            if (!dialogue.text || typeof dialogue.order !== 'number') {
              return false;
            }
          }
        }
      }
    }

    return true;
  }
}

export const importService = new ImportService();
