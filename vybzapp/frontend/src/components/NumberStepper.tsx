import React from 'react';

export interface NumberStepperProps {
  id: string;
  name: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
  required?: boolean;
  isInvalid?: boolean;
  labelledBy?: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  id,
  name,
  value,
  min = 1,
  onChange,
  required = false,
  isInvalid = false,
  labelledBy,
}) => {
  const numericValue = Number.isFinite(value) ? value : min;

  const setValue = (next: number) => {
    onChange(Math.max(min, next));
  };

  return (
    <div className={`number-stepper${isInvalid ? ' is-invalid' : ''}`}>
      <button
        type="button"
        className="number-stepper__btn"
        aria-label="Decrease order"
        onClick={() => setValue(numericValue - 1)}
        disabled={numericValue <= min}
      >
        <svg className="number-stepper__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8h9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      <input
        type="number"
        inputMode="numeric"
        className={`number-stepper__input${isInvalid ? ' is-invalid' : ''}`}
        id={id}
        name={name}
        min={min}
        value={numericValue}
        required={required}
        aria-labelledby={labelledBy}
        onChange={(event) => {
          const parsed = parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed)) {
            setValue(parsed);
          }
        }}
      />
      <button
        type="button"
        className="number-stepper__btn"
        aria-label="Increase order"
        onClick={() => setValue(numericValue + 1)}
      >
        <svg className="number-stepper__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 3.5v9M3.5 8h9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default NumberStepper;
