import React, { useEffect, useState } from 'react';
import { AdPlacement } from '../services/api';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { toViewerTextureUrl } from '../utils/adSlotTargets';

export const AD_VISIT_ARM_MS = 400;

export function destinationHost(url: string): string {
  if (!url) {
    return '';
  }
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://justvybz.com');
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || url;
  }
}

interface AdVisitSheetProps {
  placement: AdPlacement;
  onClose: () => void;
  onVisit: () => void;
}

const AdVisitSheet: React.FC<AdVisitSheetProps> = ({ placement, onClose, onVisit }) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), AD_VISIT_ARM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (!armed) {
      return;
    }
    onClose();
  };
  const dialogRef = useDialogA11y(true, handleClose);

  const handleVisit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!armed) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onVisit();
  };
  const title = placement.creative_title?.trim() || 'Advertisement';
  const advertiser = placement.advertiser_name?.trim();
  const description = placement.alt_text?.trim();
  const showDescription = Boolean(description && description.toLowerCase() !== title.toLowerCase());
  const host = destinationHost(placement.destination_url);
  const imageUrl = placement.creative_image_url
    ? toViewerTextureUrl(placement.creative_image_url)
    : '';

  return (
    <div className="ad-visit-sheet">
      <button
        type="button"
        className="ad-visit-sheet__backdrop"
        aria-label="Dismiss advertisement"
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        className="ad-visit-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-visit-sheet-title"
        aria-describedby="ad-visit-sheet-leave"
        tabIndex={-1}
      >
        <div className="ad-visit-sheet__handle" aria-hidden="true" />
        <div className="ad-visit-sheet__body">
          {imageUrl ? (
            <div className="ad-visit-sheet__thumbWrap">
              <img
                className="ad-visit-sheet__thumb"
                src={imageUrl}
                alt=""
              />
            </div>
          ) : null}
          <div className="ad-visit-sheet__copy">
            <p className="ad-visit-sheet__eyebrow">Sponsored</p>
            <h2 id="ad-visit-sheet-title" className="ad-visit-sheet__title">
              {title}
            </h2>
            {advertiser ? (
              <p className="ad-visit-sheet__advertiser">{advertiser}</p>
            ) : null}
            {showDescription ? (
              <p className="ad-visit-sheet__desc">{description}</p>
            ) : null}
            <p id="ad-visit-sheet-leave" className="ad-visit-sheet__leave">
              {host
                ? `You’ll leave this story to visit ${host}.`
                : 'This opens a different site.'}
            </p>
          </div>
        </div>
        <div className="ad-visit-sheet__actions">
          <button
            type="button"
            className="product-landing__ctaGhost ad-visit-sheet__btn"
            onClick={handleClose}
          >
            Stay here
          </button>
          {placement.destination_url ? (
            <a
              className="stories-landing__btnPrimary ad-visit-sheet__btn"
              href={placement.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleVisit}
            >
              Visit site
            </a>
          ) : (
            <button
              type="button"
              className="stories-landing__btnPrimary ad-visit-sheet__btn"
              disabled
            >
              Visit site
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdVisitSheet;
