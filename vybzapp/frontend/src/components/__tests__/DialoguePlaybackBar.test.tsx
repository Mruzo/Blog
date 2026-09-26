import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DialoguePlaybackBar, {
  PLAYBACK_SPEED_1X_MS,
  PLAYBACK_SPEED_1_5X_MS,
} from '../DialoguePlaybackBar';

function renderBar(
  overrides: Partial<React.ComponentProps<typeof DialoguePlaybackBar>> = {}
) {
  const onPrevious = jest.fn();
  const onNext = jest.fn();
  const onTogglePlay = jest.fn();
  const onSpeedChange = jest.fn();
  render(
    <DialoguePlaybackBar
      current={9}
      total={19}
      isPlaying={false}
      playSpeed={PLAYBACK_SPEED_1X_MS}
      onPrevious={onPrevious}
      onNext={onNext}
      onTogglePlay={onTogglePlay}
      onSpeedChange={onSpeedChange}
      previousTitle="Previous dialogue (8/19)"
      nextTitle="Next dialogue (9/19)"
      {...overrides}
    />
  );
  return { onPrevious, onNext, onTogglePlay, onSpeedChange };
}

describe('DialoguePlaybackBar', () => {
  it('shows progress and emits transport actions', () => {
    const { onPrevious, onNext, onTogglePlay, onSpeedChange } = renderBar();

    expect(screen.getByText('9 / 19')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous dialogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    expect(onSpeedChange).toHaveBeenCalledWith(PLAYBACK_SPEED_1_5X_MS);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('hides fullscreen unless asked, then toggles it', () => {
    const onToggleFullscreen = jest.fn();
    const { rerender } = render(
      <DialoguePlaybackBar
        current={1}
        total={2}
        isPlaying={false}
        playSpeed={PLAYBACK_SPEED_1X_MS}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        onTogglePlay={jest.fn()}
        onSpeedChange={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).toBeNull();

    rerender(
      <DialoguePlaybackBar
        current={1}
        total={2}
        isPlaying
        playSpeed={PLAYBACK_SPEED_1X_MS}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        onTogglePlay={jest.fn()}
        onSpeedChange={jest.fn()}
        showFullscreen
        isFullscreen={false}
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });
});
