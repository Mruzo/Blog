import React from 'react';
import MetaTags from './MetaTags';
import { Episode } from '../services/api';

interface EpisodeMetaTagsProps {
  episode: Episode;
  storyTitle?: string;
  seasonNumber?: number;
  coverImage?: string;
  storyImage?: string;
}

const EpisodeMetaTags: React.FC<EpisodeMetaTagsProps> = ({
  episode,
  storyTitle,
  seasonNumber,
  coverImage,
  storyImage,
}) => {
  // Generate title similar to Django's generate_meta_tags
  const title = storyTitle 
    ? `${storyTitle} - Episode ${episode.episode_number}`
    : `Episode ${episode.episode_number}`;
  
  // Use episode description or fallback
  const description = episode.description || episode.summary || 'Interactive 3D comic episode';
  
  // Get image: episode cover_image > story comic_image > default
  const image = coverImage || storyImage || undefined;
  
  // Generate URL (similar to get_absolute_url)
  const episodeUrl = seasonNumber 
    ? `https://www.justvybz.com/immersivecomics/seasons/${episode.season}/episodes/${episode.id}/`
    : `https://www.justvybz.com/immersivecomics/episodes/${episode.id}/`;

  return (
    <MetaTags
      title={title}
      description={description}
      image={image}
      url={episodeUrl}
      type="article"
      twitterImage={image}
      twitterImageAlt={`${title} - 3D Comic Episode`}
    />
  );
};

export default EpisodeMetaTags;

