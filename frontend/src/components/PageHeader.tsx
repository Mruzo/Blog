import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  actions, 
  className = '' 
}) => {
  return (
    <>
      {/* Header */}
      <div className={`d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2 ${className}`}>
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="subtext-btn mb-0">{title}</h1>
        </div>
        {actions && (
          <div className="d-flex gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      
      {/* Description */}
      {description && (
        <div className="mb-4">
          <p className="subtext-btn-sm text-muted mb-0">{description}</p>
        </div>
      )}
    </>
  );
};

export default PageHeader;
