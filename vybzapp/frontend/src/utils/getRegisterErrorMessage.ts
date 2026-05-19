const ACCOUNT_EXISTS_HINT =
  'An account with this username or email may already exist. Check your inbox for a verification email, try signing in, or use password reset if you forgot your password.';

export function getRegisterErrorMessage(
  error: unknown,
  fallback = 'Registration failed. Please try again.'
): string {
  const apiError =
    (error as { response?: { data?: { error?: string; message?: string } } })
      ?.response?.data?.error ||
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as { message?: string })?.message;

  if (!apiError || typeof apiError !== 'string') {
    return fallback;
  }

  const lower = apiError.toLowerCase();
  if (
    lower.includes('already exists') ||
    lower.includes('already in use')
  ) {
    return `${apiError} ${ACCOUNT_EXISTS_HINT}`;
  }

  return apiError;
}
