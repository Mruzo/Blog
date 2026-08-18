import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  value?: string | File;
  onChange: (file: File | null) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  accept = 'image/*',
  className = '',
  disabled = false,
  placeholder = 'Choose cover image...'
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onChange(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openPicker = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const currentPreview = typeof value === 'string' ? value : preview;

  return (
    <div className={`image-upload ${className}`}>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="visually-hidden"
        disabled={disabled}
        aria-label={placeholder}
      />

      {currentPreview ? (
        <div className="preview-container" style={{ position: 'relative' }}>
          <img
            src={currentPreview}
            alt="Selected image preview"
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '4px',
              objectFit: 'cover'
            }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-sm btn-outline-danger"
              aria-label="Remove image"
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          )}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary subtext-btn-sm"
              onClick={openPicker}
              disabled={disabled}
            >
              Replace image
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={placeholder}
          aria-disabled={disabled}
          style={{
            border: '2px dashed #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: dragActive ? '#f8f9fa' : 'transparent',
            transition: 'all 0.2s ease',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2" aria-hidden="true"></i>
          <p className="subtext-btn-sm text-muted mb-0">
            {placeholder}
          </p>
          <p className="subtext-btn-sm text-muted">
            Drag & drop or click to select
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
