const PRODUCTION_STATIC_FALLBACK = 'https://d3vnhbsvpdc5c7.cloudfront.net/static/';

/** Nav/footer logos: S3 in production; CRA public/ paths in local dev. */
export function brandImageUrl(djangoFileName: string, devPublicPath: string): string {
  const staticBase =
    process.env.REACT_APP_STATIC_URL ||
    (process.env.NODE_ENV === 'production' ? PRODUCTION_STATIC_FALLBACK : '');

  if (staticBase) {
    return `${staticBase}snmov/img/${encodeURIComponent(djangoFileName)}`;
  }
  return devPublicPath;
}

export const headerLogoUrl = brandImageUrl('jv_header 1.2.svg', '/jv_header.svg');
export const footerLogoUrl = brandImageUrl('logo 80x80.svg', '/logo-80x80.svg');
export const poweredByLogoUrl = brandImageUrl('powered-by-logo.png', '/powered-by-logo.png');
export const aboutImageUrl = brandImageUrl('about.png', '/static/snmov/img/about.png');
