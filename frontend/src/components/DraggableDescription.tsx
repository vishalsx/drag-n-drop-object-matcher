import React, { useState } from 'react';
import { SpeakerIcon } from './Icons';

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
  onSpeakHint?: (text: string) => void;
  languageBcp47?: string;
  label?: string;
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

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (props.onSpeakHint) {
      props.onSpeakHint(displayText);
    }
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
      className={`relative px-4 py-2 rounded-lg border border-slate-600 shadow-md transition-all duration-300 flex items-center justify-between group ${props.isMatched ? matchedStyles : defaultStyles} ${props.isWrongDrop ? wrongDropStyles : ''} ${props.isJustMatched ? justMatchedStyles : ''}`}
    >
      {props.label && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
          {props.label}
        </div>
      )}
      <p key={hintType} className={`text-sm text-slate-300 flex-grow pr-2 animate-fadeIn ${props.label ? 'pl-8' : ''}`}>{displayText}</p>
      {!props.isMatched && (
        <div className="flex-shrink-0 ml-2 flex flex-col gap-1">
          <button
            onClick={handleFlip}
            onMouseDown={(e) => e.stopPropagation()} // Prevents drag start on button click
            className="p-1 rounded-full text-slate-400 hover:bg-slate-500/50 hover:text-white transition-colors"
            aria-label="Cycle hint type"
          >
            <CycleIcon className="w-5 h-5" />
          </button>
          {props.onSpeakHint && (
            <button
              type="button"
              onClick={handleSpeak}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-500/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Speak hint"
            >
              <SpeakerIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DraggableDescription;