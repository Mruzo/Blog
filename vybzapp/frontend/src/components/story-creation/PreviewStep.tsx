import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import StoryPreviewEditor from '../StoryPreviewEditor';
import { apiService } from '../../services/api';
import { useApi } from '../../contexts/ApiContext';
import LoadingSpinner from '../LoadingSpinner';

interface PreviewStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  registerFooterNext?: (fn: (() => Promise<void>) | null) => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  registerFooterNext,
}) => {
  const { updateDialogue } = useApi();
  const [loadingModel, setLoadingModel] = useState(!data.model.previewUrl);
  const [modelError, setModelError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSharedModel = async () => {
      if (data.model.previewUrl) {
        setLoadingModel(false);
        return;
      }

      setLoadingModel(true);
      setModelError('');
      try {
        const defaults = await apiService.getDefaultModel();
        const previewUrl = defaults.model_gltf || defaults.model_usdz || null;
        if (cancelled) return;

        if (!previewUrl) {
          setModelError('The shared 3D scene is not available yet. You can still continue to publish.');
          setLoadingModel(false);
          return;
        }

        onDataUpdate({
          model: {
            ...data.model,
            file: null,
            file_url: previewUrl,
            previewUrl,
            format: defaults.model_gltf ? 'glb' : 'usdz',
            usesSharedModel: true,
          },
        });
      } catch {
        if (!cancelled) {
          setModelError('Could not load the shared 3D scene. You can still continue to publish.');
        }
      } finally {
        if (!cancelled) {
          setLoadingModel(false);
        }
      }
    };

    void loadSharedModel();
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount / when preview URL missing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistDialogueCamerasAndAdvance = useCallback(async () => {
    // Dial Save is local; push camera framing to the API once when leaving Preview.
    for (const dialogue of data.dialogues) {
      if (typeof dialogue.id !== 'number') {
        continue;
      }
      try {
        await updateDialogue(dialogue.id, {
          camera_orbit: dialogue.camera_orbit,
          camera_target: dialogue.camera_target,
          field_of_view: dialogue.field_of_view,
          zoom_speed: dialogue.zoom_speed,
        });
      } catch (error) {
        console.error('Failed to persist dialogue camera:', dialogue.id, error);
      }
    }
    onNext();
  }, [data.dialogues, updateDialogue, onNext]);

  useLayoutEffect(() => {
    if (!registerFooterNext) {
      return;
    }
    registerFooterNext(() => persistDialogueCamerasAndAdvance());
    return () => registerFooterNext(null);
  }, [registerFooterNext, persistDialogueCamerasAndAdvance]);

  if (loadingModel) {
    return <LoadingSpinner message="Loading shared 3D scene…" />;
  }

  return (
    <div>
      <div className="mb-3 rounded border bg-light p-3">
        <p className="subtext-btn-sm mb-0 text-muted">
          Preview uses the shared JustVybz 3D model. Adjust each dialogue’s camera, hit Save on that
          line, then continue. Framing is stored with the episode when you go Next or save a draft.
        </p>
      </div>
      {modelError && (
        <p className="stories-landing__commentError mb-3" role="alert">
          {modelError}
        </p>
      )}
      <StoryPreviewEditor
        data={data}
        onDataUpdate={onDataUpdate}
        onNext={onNext}
        onBack={onPrevious}
      />
    </div>
  );
};

export default PreviewStep;
