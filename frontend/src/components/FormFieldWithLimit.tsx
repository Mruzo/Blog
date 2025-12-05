import React from 'react';

interface FormFieldWithLimitProps {
  children: React.ReactElement;
  value: string;
  maxLength: number;
  showLimit?: boolean;
}

const FormFieldWithLimit: React.FC<FormFieldWithLimitProps> = ({
  children,
  value,
  maxLength,
  showLimit = true
}) => {
  const currentLength = value?.length || 0;
  const remaining = maxLength - currentLength;
  const isNearLimit = remaining < maxLength * 0.1; // Show warning when 10% remaining
  const isOverLimit = remaining < 0;

  // Clone the child element and add maxLength attribute
  const existingProps = children.props as Record<string, any>;
  const fieldWithLimit = React.cloneElement(children, {
    ...existingProps,
    maxLength: maxLength
  } as any);

  if (!showLimit) {
    return <>{fieldWithLimit}</>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {fieldWithLimit}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '11px',
          color: isOverLimit ? '#dc3545' : isNearLimit ? '#ffc107' : '#6c757d',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '2px 6px',
          borderRadius: '3px',
          pointerEvents: 'none',
          fontWeight: isOverLimit || isNearLimit ? '600' : '400',
          zIndex: 10,
        }}
      >
        {currentLength}/{maxLength}
      </div>
    </div>
  );
};

export default FormFieldWithLimit;

