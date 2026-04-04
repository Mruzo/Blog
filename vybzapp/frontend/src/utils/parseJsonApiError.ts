/**
 * Best-effort message from a non-OK fetch Response with JSON body (DRF style).
 */
export async function parseJsonApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.error === 'string' && d.error.trim()) {
        return d.details ? `${d.error} (${String(d.details)})` : d.error;
      }
      if (typeof d.message === 'string' && d.message.trim()) {
        return d.message;
      }
      const detail = d.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
