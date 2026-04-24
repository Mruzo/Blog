/**
 * Base URL for snmov REST routes (`/api/products/`, `/api/site-images/`, …), no trailing slash.
 * When `REACT_APP_API_URL` is absolute (e.g. https://host/api/icvybz), storefront `fetch('/api/…')`
 * would otherwise hit the SPA origin only — this keeps product + site-image calls on the API host.
 */
export function getSnmovApiBase(): string {
  const override = (process.env.REACT_APP_SMOV_API_BASE || '').trim().replace(/\/+$/, '');
  if (override) return override;

  const raw = (process.env.REACT_APP_API_URL || '/api/icvybz').trim();
  if (!raw) return '/api';

  const trimmed = raw.replace(/\/+$/, '');
  const stripIcvybz = (s: string) => s.replace(/\/icvybz$/i, '').replace(/\/+$/, '') || '/api';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const path = (u.pathname || '').replace(/\/+$/, '') || '';
      if (/\/icvybz$/i.test(path)) {
        u.pathname = stripIcvybz(path);
        return u.toString().replace(/\/+$/, '');
      }
    } catch {
      /* ignore */
    }
    return stripIcvybz(trimmed);
  }

  if (/\/icvybz$/i.test(trimmed)) {
    const stripped = stripIcvybz(trimmed);
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  return '/api';
}

/** Full URL for a path under the snmov API root (path must not start with `/api/`). */
export function snmovApiUrl(path: string): string {
  const p = path.replace(/^\//, '');
  const base = getSnmovApiBase().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(base)) {
    return `${base}/${p}`;
  }
  const root = base.startsWith('/') ? base : `/${base}`;
  return `${root}/${p}`;
}
