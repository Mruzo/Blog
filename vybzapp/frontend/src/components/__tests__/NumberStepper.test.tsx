import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NumberStepper from '../NumberStepper';

describe('NumberStepper', () => {
  it('increases and decreases with visible buttons', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <NumberStepper id="order" name="order" value={2} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase order' }));
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'Decrease order' }));
    expect(onChange).toHaveBeenCalledWith(1);

    rerender(<NumberStepper id="order" name="order" value={1} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Decrease order' })).toBeDisabled();
  });

  it('keeps the typed value at or above the minimum', () => {
    const onChange = jest.fn();
    render(<NumberStepper id="order" name="order" value={2} min={1} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
