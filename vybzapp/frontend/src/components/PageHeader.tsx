import React from 'react';

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
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
          <div className="w-100 d-md-flex justify-content-md-end align-self-stretch">
            {actions}
          </div>
        )}
      </div>
      
      {/* Description */}
      {description && (
        <div className="mb-2">
          {typeof description === 'string' ? (
            <p className="subtext-btn-sm text-muted mb-0">{description}</p>
          ) : (
            description
          )}
        </div>
      )}
    </>
  );
};

export default PageHeader;
