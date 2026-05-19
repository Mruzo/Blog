import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordField from '../PasswordField';

describe('PasswordField', () => {
  it('renders password input hidden by default', () => {
    render(
      <PasswordField
        id="password"
        name="password"
        label="Password"
        value="secret"
        onChange={jest.fn()}
      />
    );

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect((input as HTMLInputElement).value).toBe('secret');
  });

  it('toggles visibility and aria state', () => {
    render(
      <PasswordField
        id="password"
        name="password"
        label="Password"
        value="secret"
        onChange={jest.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
