import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameObject } from './types';
import { fetchGameData, uploadScore } from './services/gameService';
import DraggableDescription from './components/DraggableDescription';
import DroppableImage from './components/DroppableImage';
import Confetti from './components/Confetti';

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
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

// --- Language Carousel Component ---

interface Language {
  code: string;
  name: string;
  imageUrl: string;
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
    <div className="relative w-full h-36 flex items-center justify-center my-4">
      <button 
        onClick={goToPrevious} 
        className="absolute left-0 sm:left-1/4 z-30 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Previous language"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div className="relative w-48 h-28">
        {languages.map((lang, index) => {
            let offset = index - currentIndex;
            if (offset > languages.length / 2) offset -= languages.length;
            if (offset < -languages.length / 2) offset += languages.length;

            const isCurrent = offset === 0;
            const isVisible = Math.abs(offset) <= 1;
            
            let transform = `translateX(${offset * 60}%) scale(${isCurrent ? 1 : 0.8})`;
            if (!isVisible) {
                transform = `translateX(${offset > 0 ? 120 : -120}%) scale(0.5)`;
            }

            return (
              <div
                key={lang.code}
                className="absolute w-full h-full cursor-pointer"
                style={{
                  zIndex: isCurrent ? 10 : 5,
                  transform: transform,
                  opacity: isVisible ? (isCurrent ? 1 : 0.5) : 0,
                  filter: isCurrent ? 'blur(0)' : 'blur(2px)',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                onClick={() => onSelectLanguage(lang.code)}
                role="button"
                tabIndex={isCurrent ? 0 : -1}
                aria-label={`Select language: ${lang.name}`}
              >
                <img src={lang.imageUrl} alt={lang.name} className="w-full h-full object-cover rounded-xl shadow-lg" />
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg tracking-wider drop-shadow-md">{lang.name}</span>
                </div>
              </div>
            );
        })}
      </div>

      <button 
        onClick={goToNext} 
        className="absolute right-0 sm:right-1/4 z-30 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Next language"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

const LANGUAGES: Language[] = [
  { code: 'English', name: 'English', imageUrl: '/lang-english.jpg'},
  { code: 'Hindi', name: 'Hindi', imageUrl: '/lang-hindi.jpg'  },
  { code: 'Kokborok', name: 'Kokborok', imageUrl: '/lang-kobborok.jpg'},
  { code: 'Gujrati', name: 'Gujarati', imageUrl: '/lang-gujrati.jpg' },
  { code: 'Punjabi', name: 'Punjabi', imageUrl: '/lang-punjabi.jpg'  },
  { code: 'French', name: 'French', imageUrl: '/lang-french.jpg' },
  { code: 'Vietnamese', name: 'Vietnamese', imageUrl: '/lang-vietnamese.jpg' },
  { code: 'Arabic', name: 'Arabic', imageUrl: '/lang-arabic.jpg'  },
  { code: 'Urdu', name: 'Urdu', imageUrl: '/lang-urdu.jpg'  },
];

const IMAGE_COUNT = 6;


const App: React.FC = () => {
  const [gameData, setGameData] = useState<GameObject[]>([]);
  const [shuffledDescriptions, setShuffledDescriptions] = useState<GameObject[]>([]);
  const [shuffledImages, setShuffledImages] = useState<GameObject[]>([]);
  const [correctlyMatchedIds, setCorrectlyMatchedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [wrongDropTargetId, setWrongDropTargetId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [debouncedLanguage, setDebouncedLanguage] = useState<string>('English');

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



  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    setIsGameComplete(false);
    setShowConfetti(false);
    setCorrectlyMatchedIds(new Set());
    setScore(0);
    const data = await fetchGameData(debouncedLanguage, IMAGE_COUNT);
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
  }, [initializeGame]);

  useEffect(() => {
    if (gameData.length > 0 && correctlyMatchedIds.size === gameData.length && !isGameComplete) {
      setShowConfetti(true);
      uploadScore(score);
      const timer = setTimeout(() => {
        setIsGameComplete(true);
      }, 3000); // Display confetti over completed game for 3s

      return () => clearTimeout(timer);
    }
  }, [correctlyMatchedIds, gameData.length, score, isGameComplete]);

  const handleDrop = (imageId: string, descriptionId: string) => {
    if (imageId === descriptionId) {
      setScore(prevScore => prevScore + 10);
      setCorrectlyMatchedIds(prevIds => new Set(prevIds).add(imageId));
    } else {
      setScore(prevScore => prevScore - 5);
      playWrongSound();
      setWrongDropTargetId(imageId);
      setTimeout(() => {
        setWrongDropTargetId(null);
      }, 500); // Duration of the shake animation
    }
    setDropTargetId(null);
  };
  
  const handleDragEnter = (imageId: string) => {
      setDropTargetId(imageId);
  };
  
  const handleDragLeave = () => {
      setDropTargetId(null);
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
            {/* Left Panel: Descriptions */}
            <div className="p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Hints</h2>
              <div className="space-y-4">
                {shuffledDescriptions.map(item => (
                  <DraggableDescription
                    key={`desc-${item.id}`}
                    id={item.id}
                    description={item.description}
                    isMatched={correctlyMatchedIds.has(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Right Panel: Images */}
            <div className="p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Objects</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shuffledImages.map(item => (
                  <DroppableImage
                    key={`img-${item.id}`}
                    id={item.id}
                    imageUrl={item.imageUrl}
                    description={item.description}
                    tooltipText={item.object_description}
                    imageName={item.imageName}
                    isMatched={correctlyMatchedIds.has(item.id)}
                    onDropItem={handleDrop}
                    isDropTarget={dropTargetId === item.id}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    isWrongDrop={wrongDropTargetId === item.id}
                  />
                ))}
              </div>
            </div>
          </main>

        {isGameComplete && (
          <div
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            <div className="text-center p-12 bg-slate-800 rounded-lg shadow-2xl pointer-events-auto animate-fadeIn border border-slate-700">
              <h2 id="completion-title" className="text-4xl font-bold text-green-400">Congratulations!</h2>
              <p className="mt-4 text-xl text-slate-300">You've matched all the items!</p>
              <p className="mt-2 text-2xl text-slate-200">Final Score: {score}</p>
              <button
                onClick={initializeGame}
                className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
              >
                Play Again
              </button>
            </div>
          </div>          
        )}
      </div>
    </div>
  );
};

export default App;