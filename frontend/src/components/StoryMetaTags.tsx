import React from 'react';
import MetaTags from './MetaTags';
import { Story } from '../services/api';

interface StoryMetaTagsProps {
  story: Story;
}

const StoryMetaTags: React.FC<StoryMetaTagsProps> = ({ story }) => {
  // Generate title
  const title = `${story.title} - Immersive Comics`;
  
  // Use story description
  const description = story.description || 'Interactive 3D comic story';
  
  // Get image URL
  const image = typeof story.comic_image === 'string' ? story.comic_image : undefined;
  
  // Generate URL
  const storyUrl = `https://www.justvybz.com/immersivecomics/story/${story.id}/`;

  return (
    <MetaTags
      title={title}
      description={description}
      image={image}
      url={storyUrl}
      type="article"
      twitterImage={image}
      twitterImageAlt={`${story.title} - 3D Comic Story`}
    />
  );
};

export default StoryMetaTags;

