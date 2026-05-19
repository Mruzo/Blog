import { getRegisterErrorMessage } from './getRegisterErrorMessage';

describe('getRegisterErrorMessage', () => {
  it('returns fallback for unknown errors', () => {
    expect(getRegisterErrorMessage({})).toBe(
      'Registration failed. Please try again.'
    );
  });

  it('appends account-exists hint for duplicate username', () => {
    const message = getRegisterErrorMessage({
      response: { data: { error: 'Username already exists' } },
    });
    expect(message).toContain('Username already exists');
    expect(message).toContain('verification email');
  });

  it('appends account-exists hint for duplicate email', () => {
    const message = getRegisterErrorMessage({
      response: { data: { error: 'Email address already in use' } },
    });
    expect(message).toContain('Email address already in use');
    expect(message).toContain('password reset');
  });

  it('returns API error unchanged for other failures', () => {
    expect(
      getRegisterErrorMessage({
        response: { data: { error: 'Passwords do not match' } },
      })
    ).toBe('Passwords do not match');
  });
});
