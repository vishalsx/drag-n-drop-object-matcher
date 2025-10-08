import React, { useState } from 'react';

// Using a refresh/cycle icon for toggling hints
const CycleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.695v4.992h-4.992m0 0l-3.181-3.183a8.25 8.25 0 0111.667 0l3.181 3.183" />
  </svg>
);

interface DraggableDescriptionProps {
  id: string;
  description: string;
  shortHint: string;
  objectName: string;
  isMatched: boolean;
  isWrongDrop: boolean;
  isJustMatched: boolean;
}

const DraggableDescription: React.FC<DraggableDescriptionProps> = (props) => {
  const [hintType, setHintType] = useState<'normal' | 'short' | 'name'>('normal');

  let displayText;
  switch (hintType) {
    case 'short':
      displayText = props.shortHint;
      break;
    case 'name':
      displayText = props.objectName;
      break;
    default:
      displayText = props.description;
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (props.isMatched) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("descriptionId", props.id);
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHintType(prev => {
      if (prev === 'normal') return 'short';
      if (prev === 'short') return 'name';
      return 'normal';
    });
  };

  const matchedStyles = "opacity-40 bg-green-900/50 cursor-not-allowed scale-95";
  const defaultStyles = "bg-slate-700 hover:bg-slate-600 hover:scale-105 cursor-grab active:cursor-grabbing";
  const wrongDropStyles = "border-red-500 animate-shake";
  const justMatchedStyles = "animate-success-pulse";

  return (
    <div
      id={`desc-${props.id}`}
      draggable={!props.isMatched}
      onDragStart={handleDragStart}
      className={`p-4 rounded-lg border border-slate-600 shadow-md transition-all duration-300 flex items-start justify-between ${props.isMatched ? matchedStyles : defaultStyles} ${props.isWrongDrop ? wrongDropStyles : ''} ${props.isJustMatched ? justMatchedStyles : ''}`}
    >
      <p key={hintType} className="text-sm text-slate-300 flex-grow pr-2 animate-fadeIn">{displayText}</p>
      {!props.isMatched && (
        <div className="flex-shrink-0 ml-2">
            <button
            onClick={handleFlip}
            onMouseDown={(e) => e.stopPropagation()} // Prevents drag start on button click
            className="p-1 rounded-full text-slate-400 hover:bg-slate-500/50 hover:text-white transition-colors"
            aria-label="Cycle hint type"
            >
            <CycleIcon className="w-5 h-5" />
            </button>
        </div>
      )}
    </div>
  );
};

export default DraggableDescription;