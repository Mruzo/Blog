import React, { useState } from 'react';
import './PasswordField.css';

export interface PasswordFieldProps {
  id: string;
  name: string;
  label: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  autoComplete,
  autoFocus = false,
}) => {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? 'Hide password' : 'Show password';

  return (
    <div className="password-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <div className="password-field__wrap">
        <input
          type={visible ? 'text' : 'password'}
          className="form-control password-field__input"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-pressed={visible}
        >
          <i
            className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
