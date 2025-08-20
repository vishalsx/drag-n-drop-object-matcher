import React, { useState, useEffect, useCallback } from 'react';
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

const App: React.FC = () => {
  const [gameData, setGameData] = useState<GameObject[]>([]);
  const [shuffledDescriptions, setShuffledDescriptions] = useState<GameObject[]>([]);
  const [shuffledImages, setShuffledImages] = useState<GameObject[]>([]);
  const [correctlyMatchedIds, setCorrectlyMatchedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [wrongDropTargetId, setWrongDropTargetId] = useState<string | null>(null);

  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    setIsGameComplete(false);
    setCorrectlyMatchedIds(new Set());
    setScore(0);
    const data = await fetchGameData();
    setGameData(data);
    setShuffledDescriptions(shuffleArray(data));
    setShuffledImages(shuffleArray(data));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameData.length > 0 && correctlyMatchedIds.size === gameData.length) {
      setIsGameComplete(true);
      uploadScore(score);
    }
  }, [correctlyMatchedIds, gameData.length, score]);

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <h1 className="text-3xl font-bold animate-pulse text-white">Loading Game...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8 text-white">
      {isGameComplete && <Confetti />}
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            Object Matcher
          </h1>
          <p className="text-slate-400 mt-2">Drag the description to the correct image!</p>
          <div className="mt-4 text-2xl font-bold text-yellow-400">Score: {score}</div>
        </header>

        {isGameComplete ? (
          <div className="text-center p-12 bg-slate-800 rounded-lg shadow-2xl">
            <h2 className="text-4xl font-bold text-green-400">Congratulations!</h2>
            <p className="mt-4 text-xl text-slate-300">You've matched all the items!</p>
            <p className="mt-2 text-2xl text-slate-200">Final Score: {score}</p>
            <button
              onClick={initializeGame}
              className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
            >
              Play Again
            </button>
          </div>
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel: Descriptions */}
            <div className="p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Descriptions</h2>
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
        )}
      </div>
    </div>
  );
};

export default App;