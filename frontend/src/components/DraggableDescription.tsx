import React, { useState, useEffect } from 'react';

// Using a refresh/cycle icon for toggling hints
const CycleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.695v4.992h-4.992m0 0l-3.181-3.183a8.25 8.25 0 0111.667 0l3.181 3.183" />
  </svg>
);

// Speaker icon for text-to-speech
const SpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
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
  languageCode: string;

}

const DraggableDescription: React.FC<DraggableDescriptionProps> = (props) => {
  const [hintType, setHintType] = useState<'normal' | 'short' | 'name'>('normal');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

 // Get the speech synthesis object from the browser
  const synth = window.speechSynthesis;

  // Effect to load available voices and clean up on unmount
  useEffect(() => {
    const getVoices = () => {
      if (synth) {
        setVoices(synth.getVoices());
      }
    };
    
    // Voices can load asynchronously. We listen for the 'voiceschanged' event.
    getVoices();
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = getVoices;
    }
    
    // Cleanup on unmount
    return () => {
        if (synth && synth.speaking) {
            synth.cancel();
        }
        if (synth) {
            // Remove the event listener to prevent memory leaks
            synth.onvoiceschanged = null;
        }
    };
  }, [synth]);


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

  // // Effect to clean up speech synthesis on component unmount
  // useEffect(() => {
  //   return () => {
  //     if (synth && synth.speaking) {
  //       synth.cancel();
  //     }
  //   };
  // }, [synth]);


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (props.isMatched) {
      e.preventDefault();
      return;
    }
    // Cancel speech when dragging starts
    if (synth && synth.speaking) {
      synth.cancel();
    }
    e.dataTransfer.setData("descriptionId", props.id);
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cancel speech when hint type changes
    if (synth && synth.speaking) {
        synth.cancel();
    }
    setHintType(prev => {
      if (prev === 'normal') return 'short';
      if (prev === 'short') return 'name';
      return 'normal';
    });
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!synth) {
      console.warn('Speech Synthesis not supported by this browser.');
      return;
    }

    if (synth.speaking) {
        synth.cancel();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(displayText);
    utterance.lang = props.languageCode;

    // Attempt to find a voice that matches the language code
    let voice = voices.find(v => v.lang === props.languageCode);
    
    // If no exact match is found, try a more generic match (e.g., 'en' for 'en-US')
    if (!voice) {
        const langPart = props.languageCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langPart));
    }
    
    if (voice) {
        utterance.voice = voice;
    } else if (voices.length > 0) {
        console.warn(`No voice found for language: ${props.languageCode}. Using browser default.`);
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
  
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
    };
  
    
    synth.speak(utterance);
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
        <div className="flex flex-col items-center space-y-2 flex-shrink-0 ml-2">
            <button
            onClick={handleFlip}
            onMouseDown={(e) => e.stopPropagation()} // Prevents drag start on button click
            className="p-1 rounded-full text-slate-400 hover:bg-slate-500/50 hover:text-white transition-colors"
            aria-label="Cycle hint type"
            >
            <CycleIcon className="w-5 h-5" />
            </button>
            {synth && (
                <button
                    onClick={handleSpeak}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-1 rounded-full text-slate-400 hover:bg-slate-500/50 hover:text-white transition-colors ${isSpeaking ? 'text-blue-400 animate-pulse' : ''}`}
                    aria-label="Read hint aloud"
                >
                    <SpeakerIcon className="w-5 h-5" />
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default DraggableDescription;