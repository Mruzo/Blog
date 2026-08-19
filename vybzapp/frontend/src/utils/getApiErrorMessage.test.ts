import { getApiErrorMessage } from './getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('uses a friendly default for bare 429 responses', () => {
    expect(
      getApiErrorMessage(
        { message: 'Request failed with status code 429', response: { status: 429, data: {} } },
        'fallback'
      )
    ).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('uses data.error for 429 and appends reset_time hint', () => {
    const msg = getApiErrorMessage(
      {
        message: 'Request failed with status code 429',
        response: {
          status: 429,
          data: { error: 'Too many login attempts. Please try again later.', reset_time: 90 }
        }
      },
      'fallback'
    );
    expect(msg).toContain('Too many login attempts');
    expect(msg).toContain('2 minutes');
  });

  it('uses non_field_errors for 400 login failure', () => {
    expect(
      getApiErrorMessage(
        {
          response: {
            status: 400,
            data: { non_field_errors: ['Unable to log in with provided credentials.'] }
          }
        },
        'fallback'
      )
    ).toBe('Unable to log in with provided credentials.');
  });

  it('returns fallback when only generic axios message is present', () => {
    expect(
      getApiErrorMessage(
        { message: 'Request failed with status code 400' },
        'Invalid username or password. Please try again.'
      )
    ).toBe('Invalid username or password. Please try again.');
  });
});
