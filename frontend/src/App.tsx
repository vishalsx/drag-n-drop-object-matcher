import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameObject } from './types/types';
import { fetchGameData, uploadScore, voteOnImage, saveTubSheet, USE_MOCK_API } from './services/gameService';
import DraggableDescription from './components/DraggableDescription';
import DroppableImage from './components/DroppableImage';
import Confetti from './components/Confetti';

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};


// --- Sound Effects ---

// Helper to play a sound for correct answers
const playCorrectSound = () => {
  if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn("AudioContext not supported by this browser.");
      return;
  }
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // A5
  oscillator.start(audioContext.currentTime);

  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
  oscillator.stop(audioContext.currentTime + 0.2);
};


// Helper to play a sound for wrong answers
const playWrongSound = () => {
  if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn("AudioContext not supported by this browser.");
      return;
  }
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
  oscillator.start(audioContext.currentTime);

  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
  oscillator.stop(audioContext.currentTime + 0.2);
};



// Helper to play a sound for game completion
const playGameCompleteSound = () => {
  if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn("AudioContext not supported by this browser.");
      return;
  }
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const playNote = (frequency: number, startTime: number, duration: number) => {
      gainNode.gain.cancelScheduledValues(startTime);
      gainNode.gain.setValueAtTime(0.2, startTime);
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
  };

  oscillator.type = 'sine';
  oscillator.start(audioContext.currentTime);
  
  const now = audioContext.currentTime;
  playNote(523.25, now, 0.15); // C5
  playNote(659.25, now + 0.15, 0.15); // E5
  playNote(783.99, now + 0.3, 0.15); // G5
  playNote(1046.50, now + 0.45, 0.3); // C6

  oscillator.stop(audioContext.currentTime + 0.8);
};

// --- Language Carousel Component ---

interface Language {
  code: string;
  name: string;
  imageUrl: string;
  bcp47: string;
}

interface LanguageCarouselProps {
  languages: Language[];
  selectedLanguage: string;
  onSelectLanguage: (languageCode: string) => void;
}

const LanguageCarousel: React.FC<LanguageCarouselProps> = ({ languages, selectedLanguage, onSelectLanguage }) => {
  const currentIndex = useMemo(() => {
    const index = languages.findIndex(lang => lang.code === selectedLanguage);
    return index === -1 ? 0 : index;
  }, [selectedLanguage, languages]);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? languages.length - 1 : currentIndex - 1;
    onSelectLanguage(languages[newIndex].code);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === languages.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    onSelectLanguage(languages[newIndex].code);
  };

  return (
    <div className="relative w-full max-w-xs mx-auto h-16 flex items-center justify-center my-2">
      <button 
        onClick={goToPrevious} 
        className="absolute left-0 z-10 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Previous language"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div className="w-full h-full overflow-hidden">
        <div 
          className="relative w-full h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {languages.map((lang, index) => (
            <div
              key={lang.code}
              className="absolute w-full h-full flex items-center justify-center"
              style={{ left: `${index * 100}%` }}
            >
              <span 
                className="text-white font-bold text-xl tracking-wider drop-shadow-md select-none cursor-pointer"
                onClick={() => onSelectLanguage(lang.code)}
                role="button"
                tabIndex={-1}
              >
                {lang.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={goToNext} 
        className="absolute right-0 z-10 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Next language"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

// --- Icons ---
const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
);
  
const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
    </svg>
);

const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const GridIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);
const ListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

// --- Constants ---
const LANGUAGES: Language[] = [
  { code: 'English', name: 'English', imageUrl: 'https://picsum.photos/seed/english/300/200', bcp47: 'en-US' },
  { code: 'Hindi', name: 'Hindi', imageUrl: 'https://picsum.photos/seed/hindi/300/200', bcp47: 'hi-IN' },
  { code: 'Kokborok', name: 'Kokborok', imageUrl: 'https://picsum.photos/seed/kokborok/300/200', bcp47: 'trp-latn' },
  { code: 'Gujarati', name: 'Gujarati', imageUrl: 'https://picsum.photos/seed/gujrati/300/200', bcp47: 'gu-IN' },
  { code: 'Punjabi', name: 'Punjabi', imageUrl: 'https://picsum.photos/seed/punjabi/300/200', bcp47: 'pa-IN' },
  { code: 'French', name: 'French', imageUrl: 'https://picsum.photos/seed/french/300/200', bcp47: 'fr-FR' },
  { code: 'Vietnamese', name: 'Vietnamese', imageUrl: 'https://picsum.photos/seed/vietnamese/300/200', bcp47: 'vi-VN' },
  { code: 'Arabic', name: 'Arabic', imageUrl: 'https://picsum.photos/seed/arabic/300/200', bcp47: 'ar-SA' },
  { code: 'Urdu', name: 'Urdu', imageUrl: 'https://picsum.photos/seed/urdu/300/200', bcp47: 'ur-PK' },
];
const IMAGE_COUNT = 6;


const App: React.FC = () => {
  const [gameData, setGameData] = useState<GameObject[]>([]);
  const [shuffledDescriptions, setShuffledDescriptions] = useState<GameObject[]>([]);
  const [shuffledImages, setShuffledImages] = useState<GameObject[]>([]);
  const [correctlyMatchedIds, setCorrectlyMatchedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [wrongDropTargetId, setWrongDropTargetId] = useState<string | null>(null);
  const [wrongDropSourceId, setWrongDropSourceId] = useState<string | null>(null);
  const [justMatchedId, setJustMatchedId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [debouncedLanguage, setDebouncedLanguage] = useState<string>('English');
  const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [nextLanguage, setNextLanguage] = useState<string>('English');
  const [sheetSaveState, setSheetSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [sheetSaveError, setSheetSaveError] = useState<string | null>(null);
  const [completionView, setCompletionView] = useState<'list' | 'grid'>('list');
  const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; top: number; left: number }>({ visible: false, content: '', top: 0, left: 0 });
  const [hoveredGridInfo, setHoveredGridInfo] = useState<{ item: GameObject; index: number } | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<Set<string>>(new Set());

  // Debounce language changes to avoid excessive API calls while browsing the carousel
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLanguage(selectedLanguage);
    }, 2500); // Wait for 2.5s of inactivity before triggering the game reload

    // Cleanup function to clear the timeout if the user selects another language
    return () => {
      clearTimeout(handler);
    };
  }, [selectedLanguage]);

  // Effect to load available voices for text-to-speech
  useEffect(() => {
    const synth = window.speechSynthesis;
    const getVoices = () => {
      if (synth) {
        setVoices(synth.getVoices());
      }
    };
    
    getVoices();
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = getVoices;
    }
    
    return () => {
        if (synth) {
            synth.onvoiceschanged = null;
        }
    };
  }, []);

  // Centralized function to speak text
  const speakText = useCallback((text: string, languageCode: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn('Speech Synthesis not supported by this browser.');
      return;
    }
    if (synth.speaking) {
      synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    let voice = voices.find(v => v.lang === languageCode);
    if (!voice) {
        const langPart = languageCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langPart));
    }
    if (voice) {
        utterance.voice = voice;
    } else if (voices.length > 0) {
        console.warn(`No voice found for language: ${languageCode}. Using browser default.`);
    }
    synth.speak(utterance);
  }, [voices]);


  const currentLanguageBcp47 = useMemo(() => {
    return LANGUAGES.find(lang => lang.code === selectedLanguage)?.bcp47 || 'en-US';
  }, [selectedLanguage]);

  const initializeGame = useCallback(async (languageOverride?: string) => {
    const languageToLoad = languageOverride || debouncedLanguage;
    setIsLoading(true);
    setIsGameComplete(false);
    setShowCompletionScreen(false);
    setShowConfetti(false);
    setCorrectlyMatchedIds(new Set());
    setScore(0);
    setSheetSaveState('idle');
    setSheetSaveError(null);

    const data = await fetchGameData(languageToLoad, IMAGE_COUNT);
    if (data.length > 0) {
      setGameData(data);
      setShuffledDescriptions(shuffleArray(data));
      setShuffledImages(shuffleArray(data));
    } else {
      setGameData([]);
      setShuffledDescriptions([]);
      setShuffledImages([]);
    }
    setIsLoading(false);
  }, [debouncedLanguage]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame, debouncedLanguage]);

  useEffect(() => {
    if (gameData.length > 0 && correctlyMatchedIds.size === gameData.length && !isGameComplete) {
      setIsGameComplete(true);
      playGameCompleteSound();
      setShowConfetti(true);
      uploadScore(score);
      setShowCompletionScreen(true);
      setNextLanguage(selectedLanguage);
    }
  }, [correctlyMatchedIds, gameData.length, score, isGameComplete, selectedLanguage]);

  const handleDrop = (imageId: string, descriptionId: string) => {
    if (imageId === descriptionId) {
      playCorrectSound();
      const matchedItem = gameData.find(item => item.id === imageId);
      if (matchedItem) {
        speakText(matchedItem.imageName, currentLanguageBcp47);
      }
      setScore(prevScore => prevScore + 10);
      setCorrectlyMatchedIds(prevIds => new Set(prevIds).add(imageId));
      setJustMatchedId(imageId);
      setTimeout(() => setJustMatchedId(null), 750);
    } else {
      setScore(prevScore => prevScore - 5);
      playWrongSound();
      setWrongDropTargetId(imageId);
      setWrongDropSourceId(descriptionId);
      setTimeout(() => {
        setWrongDropTargetId(null);
        setWrongDropSourceId(null);
      }, 500);
    }
    setDropTargetId(null);
  };
  
  const handleDragEnter = (imageId: string) => {
      setDropTargetId(imageId);
  };
  
  const handleDragLeave = () => {
      setDropTargetId(null);
  };

  const handleMatchedImageClick = (imageName: string) => {
    speakText(imageName, currentLanguageBcp47);
  };
  
  const handleVote = async (translationId: string, voteType: 'up' | 'down') => {
    if (votingInProgress.has(translationId)) {
      return; // Prevent multiple clicks
    }
  
    setVotingInProgress(prev => new Set(prev).add(translationId));
  
    const originalGameData = gameData.map(item => ({ ...item }));
  
    const optimisticUpdate = (data: GameObject[]) =>
      data.map(item => {
        if (item.id === translationId) {
          return {
            ...item,
            upvotes: voteType === 'up' ? item.upvotes + 1 : item.upvotes,
            downvotes: voteType === 'down' ? item.downvotes + 1 : item.downvotes,
          };
        }
        return item;
      });
  
    setGameData(prevData => optimisticUpdate(prevData));
  
    try {
      const result = await voteOnImage(translationId, voteType);
  
      if (result.success) {
        if (!USE_MOCK_API && result.data) {
          const serverUpdate = (data: GameObject[]) =>
            data.map(item => {
              if (item.id === result.data?.translation_id) {
                return {
                  ...item,
                  upvotes: result.data.up_votes,
                  downvotes: result.data.down_votes,
                };
              }
              return item;
            });
          setGameData(prevData => serverUpdate(prevData));
        }
      } else {
        console.error(`Failed to submit vote: ${result.message}. Reverting changes.`);
        setGameData(originalGameData);
        setVoteErrors(prev => ({ ...prev, [translationId]: result.message || 'Vote failed!' }));
        setTimeout(() => {
          setVoteErrors(prev => ({ ...prev, [translationId]: null }));
        }, 3000);
      }
    } finally {
      setVotingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(translationId);
        return newSet;
      });
    }
  };

  const handleSaveSheet = async () => {
    setSheetSaveState('saving');
    setSheetSaveError(null);
    const translationIds = gameData.map(item => item.id);
    const result = await saveTubSheet(translationIds);
    if (result.success) {
      setSheetSaveState('success');
    } else {
      setSheetSaveState('error');
      setSheetSaveError(result.message || 'Failed to save sheet.');
      setTimeout(() => setSheetSaveState('idle'), 3000); // Revert after showing error
    }
  };

  const handlePlayAgain = () => {
    setSelectedLanguage(nextLanguage);
    // Directly call initializeGame since debouncedLanguage might not be updated yet
    initializeGame(nextLanguage);
  };

  const handleShowTooltip = (e: React.MouseEvent<HTMLElement>, description: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
        visible: true,
        content: description,
        top: rect.top,
        left: rect.left + rect.width / 2,
    });
  };

  const handleHideTooltip = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
  };

  if (isLoading) {
    const currentLanguageName = LANGUAGES.find(lang => lang.code === debouncedLanguage)?.name || 'English';
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <h1 className="text-3xl font-bold animate-pulse text-white text-center">
          Loading the game {currentLanguageName}
          <span className="ml-2 inline-block animate-ping">...</span>
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8 text-white">
      {tooltip.visible && (
        <div 
          style={{ top: tooltip.top, left: tooltip.left }} 
          className="fixed transform -translate-x-1/2 -translate-y-full -mt-2 w-max max-w-xs p-2 bg-yellow-400 text-black text-xs rounded-md shadow-lg z-[60] pointer-events-none"
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-yellow-400"></div>
        </div>
      )}
      {showConfetti && <Confetti />}
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            TUB Hints
          </h1>
          <p className="text-slate-400 mt-2">Drag n drop hint to match the TUB object!</p>
          <div className="mt-4 text-2xl font-bold text-yellow-400">Score: {score}</div>
          <LanguageCarousel
            languages={LANGUAGES}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
          />
        </header>

          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Hints</h2>
              <div className="space-y-4">
                {shuffledDescriptions.map(item => (
                  <DraggableDescription key={`desc-${item.id}`} id={item.id} description={item.description} shortHint={item.short_hint} objectName={item.imageName} isMatched={correctlyMatchedIds.has(item.id)} isWrongDrop={wrongDropSourceId === item.id} isJustMatched={justMatchedId === item.id}/>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Objects</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {shuffledImages.map(item => (
                  <DroppableImage key={`img-${item.id}`} id={item.id} imageUrl={item.imageUrl} description={item.description} tooltipText={item.object_description} imageName={item.imageName} isMatched={correctlyMatchedIds.has(item.id)} onDropItem={handleDrop} isDropTarget={dropTargetId === item.id} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} isWrongDrop={wrongDropTargetId === item.id} isJustMatched={justMatchedId === item.id} onMatchedImageClick={handleMatchedImageClick}/>
                ))}
              </div>
            </div>
          </main>

        {showCompletionScreen && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 p-4" role="dialog" aria-modal="true" aria-labelledby="completion-title">
            <div className="text-center w-full max-w-6xl max-h-[90vh] flex flex-col p-6 sm:p-8 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
              <h2 id="completion-title" className="text-4xl font-bold text-green-400">Congratulations!</h2>
              <p className="mt-2 text-lg text-slate-300">You've matched all the items! Final Score: <span className="font-bold text-yellow-300">{score}</span></p>
              <p className="mt-4 text-md text-slate-400">Review your matches, vote, and save.</p>
              
              <div className="flex flex-col flex-grow my-3 overflow-hidden">
                <div className="flex justify-end gap-2 mb-4 flex-shrink-0">
                  <button onClick={() => setCompletionView('list')} className={`p-2 rounded-md transition-colors ${completionView === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} aria-label="List view">
                    <ListIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCompletionView('grid')} className={`p-2 rounded-md transition-colors ${completionView === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} aria-label="Grid view">
                    <GridIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                  {completionView === 'list' && (
                    <div className="space-y-3">
                      {gameData.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                          <div className="flex items-center text-left cursor-pointer flex-1 min-w-0 w-full mb-3 sm:mb-0 sm:mr-4" onClick={() => handleMatchedImageClick(item.imageName)}>
                            <img src={item.imageUrl} alt={item.imageName} className="w-16 h-16 rounded-md object-cover mr-4 flex-shrink-0" />
                            <div 
                                className="min-w-0 flex-1"
                                onMouseEnter={(e) => handleShowTooltip(e, item.object_description)}
                                onMouseLeave={handleHideTooltip}
                            >
                              <p className="font-bold text-slate-200 truncate">{item.imageName}</p>
                              <p className="text-sm text-slate-400 mt-1 italic truncate">"{item.object_description}"</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center space-y-1 relative sm:ml-4 flex-shrink-0">
                              <div className="flex items-center space-x-2 bg-slate-700/50 px-2 py-1 rounded-full text-white text-xs font-bold">
                                  <button onClick={() => handleVote(item.id, 'up')} disabled={votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-green-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote up"><ThumbsUpIcon className="w-4 h-4" /></button>
                                  <span className="min-w-[1.5ch] text-center">{item.upvotes}</span>
                                  <button onClick={() => handleVote(item.id, 'down')} disabled={votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote down"><ThumbsDownIcon className="w-4 h-4" /></button>
                                  <span className="min-w-[1.5ch] text-center">{item.downvotes}</span>
                              </div>
                              {voteErrors[item.id] && (<p className="text-xs text-red-400" role="alert">{voteErrors[item.id]}</p>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {completionView === 'grid' && (() => {
                    const getJustifyClass = (index: number | undefined) => {
                      if (index === undefined || index === null) return 'justify-center';
                      if (index <= 2) return 'justify-start'; // Top row
                      if (index <= 5) return 'justify-center'; // Middle row
                      return 'justify-end'; // Bottom row
                    };

                    return (
                      <div className="flex flex-col md:flex-row gap-4" onMouseLeave={() => setHoveredGridInfo(null)}>
                        <div className="w-full md:w-1/2 grid grid-cols-3 gap-2">
                          {shuffledImages.map((item, index) => (
                            <div 
                              key={item.id} 
                              className="relative flex flex-col items-center text-center p-1 bg-slate-900/50 rounded-lg border border-slate-700/50 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-blue-500"
                              onMouseEnter={() => setHoveredGridInfo({ item, index })} 
                            >
                              <div 
                                className="relative w-full h-20 mb-1" 
                                onClick={() => handleMatchedImageClick(item.imageName)}
                              >
                                <img src={item.imageUrl} alt={item.imageName} className="w-full h-full rounded-md object-cover" />
                              </div>
                              <p className="font-bold text-slate-200 text-sm" onClick={() => handleMatchedImageClick(item.imageName)}>{item.imageName}</p>
                              <div className="flex items-center space-x-2 bg-slate-700/50 px-2 py-1 rounded-full text-white text-xs font-bold mt-2">
                                  <button onClick={() => handleVote(item.id, 'up')} disabled={votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-green-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote up"><ThumbsUpIcon className="w-4 h-4" /></button>
                                  <span className="min-w-[1.5ch] text-center">{item.upvotes}</span>
                                  <button onClick={() => handleVote(item.id, 'down')} disabled={votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote down"><ThumbsDownIcon className="w-4 h-4" /></button>
                                  <span className="min-w-[1.5ch] text-center">{item.downvotes}</span>
                              </div>
                              {voteErrors[item.id] && (<p className="text-xs text-red-400 mt-1" role="alert">{voteErrors[item.id]}</p>)}
                            </div>
                          ))}
                        </div>
                        <div className={`w-full md:w-1/2 bg-slate-900/50 rounded-lg border border-slate-700/50 p-6 flex flex-col items-center transition-all duration-300 min-h-[150px] ${getJustifyClass(hoveredGridInfo?.index)}`}>
                          {hoveredGridInfo ? (
                            <div className="text-center animate-fadeIn">
                              <h3 className="font-bold text-xl text-teal-300 mb-4">{hoveredGridInfo.item.imageName}</h3>
                              <p className="text-slate-300 text-xs leading-normal">{hoveredGridInfo.item.object_description}</p>
                            </div>
                          ) : (
                            <div className="text-center text-slate-500">
                              <p>Hover over an object to see its description.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex-shrink-0 mt-4">
                <p className="text-slate-300 mb-2">Play again in another language?</p>
                 <LanguageCarousel languages={LANGUAGES} selectedLanguage={nextLanguage} onSelectLanguage={setNextLanguage}/>
                 <div className="mt-4 flex flex-wrap justify-center items-center gap-4">
                    <button onClick={handlePlayAgain} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                      Play Again
                    </button>
                    <button 
                      onClick={handleSaveSheet} 
                      disabled={sheetSaveState === 'saving' || sheetSaveState === 'success'}
                      className={`px-6 py-2 flex items-center justify-center gap-2 font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 ${
                        sheetSaveState === 'idle' ? 'bg-green-600 hover:bg-green-500 text-white' : ''
                      } ${
                        sheetSaveState === 'saving' ? 'bg-yellow-500 text-black cursor-wait' : ''
                      } ${
                        sheetSaveState === 'success' ? 'bg-teal-500 text-white cursor-not-allowed' : ''
                      } ${
                        sheetSaveState === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' : ''
                      }`}
                    >
                      {sheetSaveState === 'saving' && <><SpinnerIcon className="w-5 h-5" /> Saving...</>}
                      {sheetSaveState === 'success' && <><CheckIcon className="w-5 h-5" /> Saved!</>}
                      {sheetSaveState === 'error' && 'Save Failed'}
                      {sheetSaveState === 'idle' && <><SaveIcon className="w-5 h-5" /> Save tubCard</>}
                    </button>
                    <button onClick={() => { setShowCompletionScreen(false); setShowConfetti(false); }} className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                      Close
                    </button>
                 </div>
                 {sheetSaveError && <p className="text-red-400 text-sm mt-3" role="alert">{sheetSaveError}</p>}
              </div>
            </div>
          </div>          
        )}
      </div>
    </div>
  );
};

export default App;