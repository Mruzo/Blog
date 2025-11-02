import React from 'react';

interface DebugInfoProps {
  data: any;
  title: string;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ data, title }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="card mt-3">
      <div className="card-header">
        <h6 className="mb-0">Debug: {title}</h6>
      </div>
      <div className="card-body">
        <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DebugInfo;




