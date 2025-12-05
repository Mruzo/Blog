import React, { useRef, useEffect, useState } from 'react';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  rows?: number;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  maxLength,
  placeholder = 'Enter text...',
  className = '',
  rows = 3
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [plainTextLength, setPlainTextLength] = useState(0);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      updateTextLength();
    }
  }, [value]);

  const updateTextLength = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || '';
      setPlainTextLength(text.length);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || '';
      
      // Enforce character limit
      if (text.length > maxLength) {
        // Truncate content
        const truncated = text.substring(0, maxLength);
        editorRef.current.innerText = truncated;
        setPlainTextLength(maxLength);
        onChange(editorRef.current.innerHTML);
        return;
      }
      
      setPlainTextLength(text.length);
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateTextLength();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const isNearLimit = plainTextLength >= maxLength * 0.9;
  const isOverLimit = plainTextLength > maxLength;

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div 
        className="d-flex gap-1 p-1 border-bottom bg-light rounded-top"
        style={{ 
          fontSize: '12px',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('bold')}
          title="Bold"
        >
          <i className="fas fa-bold"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('italic')}
          title="Italic"
        >
          <i className="fas fa-italic"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('underline')}
          title="Underline"
        >
          <i className="fas fa-underline"></i>
        </button>
        <div className="border-start mx-1"></div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('justifyLeft')}
          title="Align Left"
        >
          <i className="fas fa-align-left"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('justifyCenter')}
          title="Align Center"
        >
          <i className="fas fa-align-center"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('justifyRight')}
          title="Align Right"
        >
          <i className="fas fa-align-right"></i>
        </button>
        <div className="border-start mx-1"></div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          <i className="fas fa-list-ul"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
        >
          <i className="fas fa-list-ol"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => execCommand('removeFormat')}
          title="Remove Formatting"
        >
          <i className="fas fa-remove-format"></i>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={`form-control ${className}`}
        style={{
          minHeight: `${rows * 1.5}rem`,
          maxHeight: '300px',
          overflowY: 'auto',
          borderTop: 'none',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          fontFamily: 'Quicksand, sans-serif',
          fontSize: '14px',
          padding: '8px 12px',
          outline: 'none'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Placeholder styling */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #6c757d;
          pointer-events: none;
        }
      `}</style>

      {/* Character count */}
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
          fontWeight: (isOverLimit || isNearLimit) ? '600' : '400',
          zIndex: 10,
        }}
      >
        {plainTextLength}/{maxLength}
      </div>
    </div>
  );
};

export default SimpleRichTextEditor;

