import React from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import StoryPreviewEditor from '../StoryPreviewEditor';

interface PreviewStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  return (
    <StoryPreviewEditor
      data={data}
      onDataUpdate={onDataUpdate}
      onNext={onNext}
      onBack={onPrevious}
    />
  );
};

export default PreviewStep;
