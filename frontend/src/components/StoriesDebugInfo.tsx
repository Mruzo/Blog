import React from 'react';
import { Story } from '../services/api';

interface StoriesDebugInfoProps {
  stories: Story[];
}

const StoriesDebugInfo: React.FC<StoriesDebugInfoProps> = ({ stories }) => {
  if (!stories || stories.length === 0) {
    return (
      <div className="alert alert-info">
        <h6>Debug Info: No stories loaded</h6>
        <p>Stories array is empty or undefined</p>
      </div>
    );
  }

  const draftStories = stories.filter(s => !s.is_public);
  const publishedStories = stories.filter(s => s.is_public);

  return (
    <div className="alert alert-info">
      <h6>Debug Info: Stories Data</h6>
      <p><strong>Total stories:</strong> {stories.length}</p>
      <p><strong>Draft stories:</strong> {draftStories.length}</p>
      <p><strong>Published stories:</strong> {publishedStories.length}</p>
      
      <div className="mt-3">
        <h6>Draft Stories:</h6>
        {draftStories.length > 0 ? (
          <ul className="list-unstyled">
            {draftStories.map(story => (
              <li key={story.id}>
                <strong>ID {story.id}:</strong> "{story.title || 'No title'}" 
                <span className="badge bg-secondary ms-2">Private</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No draft stories found</p>
        )}
      </div>

      <div className="mt-3">
        <h6>Published Stories:</h6>
        {publishedStories.length > 0 ? (
          <ul className="list-unstyled">
            {publishedStories.map(story => (
              <li key={story.id}>
                <strong>ID {story.id}:</strong> "{story.title || 'No title'}" 
                <span className="badge bg-success ms-2">Public</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No published stories found</p>
        )}
      </div>

      <div className="mt-3">
        <h6>Raw Stories Data:</h6>
        <pre className="small bg-light p-2" style={{ fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
          {JSON.stringify(stories, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default StoriesDebugInfo;


