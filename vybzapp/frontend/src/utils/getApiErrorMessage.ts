/**
 * Human-readable message from a failed API request (axios error shape).
 * Prefers server JSON (error, non_field_errors, detail, message) over axios's generic status text.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    response?: { status?: number; data?: Record<string, unknown> };
  };
  const data = err.response?.data;
  const status = err.response?.status;

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;

    if (typeof d.error === 'string' && d.error.trim()) {
      return appendRateLimitResetHint(d.error, d.reset_time, status);
    }
    const nfe = d.non_field_errors;
    if (Array.isArray(nfe) && typeof nfe[0] === 'string' && nfe[0].trim()) {
      return appendRateLimitResetHint(nfe[0], d.reset_time, status);
    }
    if (typeof d.message === 'string' && d.message.trim()) {
      return appendRateLimitResetHint(d.message, d.reset_time, status);
    }
    const detail = d.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return appendRateLimitResetHint(detail, d.reset_time, status);
    }
    if (Array.isArray(detail) && typeof detail[0] === 'string' && detail[0].trim()) {
      return appendRateLimitResetHint(detail[0], d.reset_time, status);
    }
  }

  const raw = err.message ?? '';
  if (raw && !/^Request failed with status code \d+$/.test(raw)) {
    return raw;
  }
  if (status === 429) {
    return appendRateLimitResetHint(
      'Too many requests. Please try again later.',
      data && typeof data === 'object' ? (data as Record<string, unknown>).reset_time : undefined,
      status
    );
  }
  return fallback;
}

function appendRateLimitResetHint(
  message: string,
  resetTime: unknown,
  status: number | undefined
): string {
  if (status !== 429 || typeof resetTime !== 'number' || resetTime <= 0 || !Number.isFinite(resetTime)) {
    return message;
  }
  const secs = Math.ceil(resetTime);
  let timePart: string;
  if (secs >= 3600) {
    const h = Math.ceil(secs / 3600);
    timePart = `You can try again in about ${h} hour${h === 1 ? '' : 's'}.`;
  } else if (secs >= 60) {
    const m = Math.ceil(secs / 60);
    timePart = `You can try again in about ${m} minute${m === 1 ? '' : 's'}.`;
  } else {
    timePart = `You can try again in about ${secs} second${secs === 1 ? '' : 's'}.`;
  }
  return `${message} ${timePart}`;
}
