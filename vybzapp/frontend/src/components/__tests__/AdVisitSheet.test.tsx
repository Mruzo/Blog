import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdVisitSheet, { AD_VISIT_ARM_MS, destinationHost } from '../AdVisitSheet';
import { AdPlacement } from '../../services/api';

const placement: AdPlacement = {
  id: 12,
  season: 33,
  campaign: 1,
  creative: 4,
  creative_title: 'Ethnic Bliss',
  creative_image_url: 'https://example.com/media/logo.png',
  destination_url: 'https://www.justvybz.com/product/',
  alt_text: 'Shop Ethnic Bliss on JustVybz',
  advertiser_name: 'Ethnic Bliss',
  name: 'panel_9',
  slot_name: 'panel_9',
  position_x: 0,
  position_y: 0,
  position_z: 0,
  normal_x: 0,
  normal_y: 1,
  normal_z: 0,
  width: 1,
  height: 1,
  rotation: '0deg 0deg 0deg',
  priority: 1,
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

describe('destinationHost', () => {
  it('strips protocol and www', () => {
    expect(destinationHost('https://www.justvybz.com/product/')).toBe('justvybz.com');
    expect(destinationHost('http://example.org/path')).toBe('example.org');
  });

  it('returns empty for a blank url', () => {
    expect(destinationHost('')).toBe('');
  });
});

function renderSheet(
  overrides: { onClose?: jest.Mock; onVisit?: jest.Mock } = {},
) {
  const onClose = overrides.onClose ?? jest.fn();
  const onVisit = overrides.onVisit ?? jest.fn();
  render(
    <AdVisitSheet
      placement={placement}
      onClose={onClose}
      onVisit={onVisit}
    />,
  );
  return { onClose, onVisit };
}

function armSheet() {
  act(() => {
    jest.advanceTimersByTime(AD_VISIT_ARM_MS);
  });
}

describe('AdVisitSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows brief ad info and keeps Visit as an external link', () => {
    renderSheet();
    armSheet();

    expect(screen.getByRole('dialog', { name: 'Ethnic Bliss' })).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByText('Shop Ethnic Bliss on JustVybz')).toBeInTheDocument();
    expect(screen.getByText(/leave this story to visit justvybz.com/i)).toBeInTheDocument();

    const visit = screen.getByRole('link', { name: 'Visit site' });
    expect(visit).toHaveAttribute('href', 'https://www.justvybz.com/product/');
    expect(visit).toHaveAttribute('target', '_blank');
    expect(visit).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('closes from Stay here, backdrop, or Escape without visiting', () => {
    const { onClose, onVisit } = renderSheet();
    armSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onVisit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss advertisement' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onVisit).not.toHaveBeenCalled();
  });

  it('tracks a visit only when Visit site is chosen', () => {
    const { onClose, onVisit } = renderSheet();
    armSheet();

    fireEvent.click(screen.getByRole('link', { name: 'Visit site' }));
    expect(onVisit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores the leftover click that Firefox fires after opening', () => {
    const { onClose, onVisit } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss advertisement' }));
    fireEvent.click(screen.getByRole('link', { name: 'Visit site' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(onVisit).not.toHaveBeenCalled();

    armSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
