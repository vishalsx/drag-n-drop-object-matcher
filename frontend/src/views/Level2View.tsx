
import React, { useState, useEffect } from 'react';
import type { Level2PictureData } from '../types/level2Types';
import Confetti from '../components/Confetti';
import LoadingScreen from './LoadingScreen';
import { SpeakerIcon, MenuIcon } from '../components/Icons';
import SidePanel from '../components/SidePanel';
import { Organisation } from '../services/routingService';
import type { Language, CategoryFosItem, Difficulty, PlaylistItem, TubSheetItem, GameObject } from '../types/types';

interface Level2ViewProps {
  pictureData: Level2PictureData;
  score: number;
  elapsedTime: number;
  onQuestionDrop: (questionId: string, targetAnswerId: string) => void;
  onPictureComplete: () => void;
  onSpeakHint: (text: string, pictureId?: string) => void;
  onImageLoaded?: () => void;

  // SidePanel Props
  languages: Language[];
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedFos: string;
  onSelectFos: (fos: string) => void;
  objectCategories: CategoryFosItem[];
  fieldsOfStudy: CategoryFosItem[];
  areCategoriesLoading: boolean;
  difficulty: Difficulty;
  onSelectDifficulty: (diff: Difficulty) => void;
  onStartGame: () => void;
  onWithdrawRequest: () => void;
  gameState: 'idle' | 'loading' | 'playing' | 'complete';
  searchKeyword: string;
  onSearchKeywordChange: (keyword: string) => void;
  onSelectBookId: (id: string | null) => void;
  onSelectChapterId: (id: string | null) => void;
  onSelectPageId: (id: string | null) => void;
  onSelectBookTitle: (title: string) => void;
  onSelectChapterName: (name: string) => void;
  onSelectPageTitle: (title: string) => void;
  selectedPageId: string | null;
  userId: string | null;
  orgData: Organisation | null;
  isContest?: boolean;
}

const Level2View: React.FC<Level2ViewProps> = ({
  pictureData,
  score,
  elapsedTime,
  onQuestionDrop,
  onPictureComplete,
  onSpeakHint,
  languages,
  selectedLanguage,
  onSelectLanguage,
  selectedCategory,
  onSelectCategory,
  selectedFos,
  onSelectFos,
  objectCategories,
  fieldsOfStudy,
  areCategoriesLoading,
  difficulty,
  onSelectDifficulty,
  onStartGame,
  onWithdrawRequest,
  gameState,
  searchKeyword,
  onSearchKeywordChange,
  onSelectBookId,
  onSelectChapterId,
  onSelectPageId,
  onSelectBookTitle,
  onSelectChapterName,
  onSelectPageTitle,
  selectedPageId,
  userId,
  orgData,
  isContest,
  onImageLoaded,
}) => {
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wrongDropId, setWrongDropId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'presets' | 'custom'>('presets');

  // Search fields state - Placeholder data for future API integration
  const [standardPlaylists] = useState<PlaylistItem[]>([
    { id: 'playlist-1', name: 'Beginner Vocabulary' },
    { id: 'playlist-2', name: 'Intermediate Phrases' },
    { id: 'playlist-3', name: 'Advanced Topics' },
  ]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');

  const [myTubSheets] = useState<TubSheetItem[]>([
    { id: 'sheet-1', name: 'My Custom Sheet 1' },
    { id: 'sheet-2', name: 'My Custom Sheet 2' },
    { id: 'sheet-3', name: 'My Custom Sheet 3' },
  ]);
  const [selectedTubSheet, setSelectedTubSheet] = useState<string>('');


  // Page selection state for playlist

  // Page selection state for playlist
  // const [selectedPageInfo, setSelectedPageInfo] = useState<{ bookId: string, chapterId: string, pageId: string } | null>(null);

  // Local loading state for playlist page fetch
  // const [isLoadingPlaylistPage, setIsLoadingPlaylistPage] = useState(false);

  // Search handlers - Placeholder functions for future API integration
  const handleSelectPlaylist = (playlistId: string) => {
    setSelectedPlaylist(playlistId);
    console.log('Selected playlist:', playlistId);
    // TODO: Integrate with API to fetch playlist data
  };

  const handleSelectTubSheet = (tubSheetId: string) => {
    setSelectedTubSheet(tubSheetId);
    console.log('Selected tubsheet:', tubSheetId);
    // TODO: Integrate with API to fetch tubsheet data
  };

  const handleSearch = () => {
    console.log('Searching for keyword:', searchKeyword);
    // TODO: Integrate with API to search based on keyword
  };

  const remainingQuestions = pictureData.questions.filter(
    q => q.isCorrect && !pictureData.matchedQuestions.has(q.id)
  );

  // Victory sound function using Web Audio API
  const playVictorySound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Define victory melody: C-E-G-C (major chord arpeggio)
      const notes = [
        { frequency: 523.25, startTime: 0, duration: 0.3 },    // C5
        { frequency: 659.25, startTime: 0.25, duration: 0.3 }, // E5
        { frequency: 783.99, startTime: 0.5, duration: 0.3 },  // G5
        { frequency: 1046.5, startTime: 0.75, duration: 0.5 }, // C6
      ];

      notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = note.frequency;
        oscillator.type = 'sine';

        // Envelope: fade in and out for smooth sound
        const now = audioContext.currentTime + note.startTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + note.duration);

        oscillator.start(now);
        oscillator.stop(now + note.duration);
      });

      // Clean up audio context after sound finishes
      setTimeout(() => {
        audioContext.close();
      }, 2000);
    } catch (error) {
      console.error('Error playing victory sound:', error);
    }
  };

  useEffect(() => {
    if (remainingQuestions.length === 0 && pictureData.matchedQuestions.size > 0) {
      setShowCelebration(true);
      playVictorySound(); // Play victory sound when confetti shows
      setTimeout(() => {
        setShowCelebration(false);
        onPictureComplete();
      }, 3000);
    }
  }, [remainingQuestions.length, pictureData.matchedQuestions.size, onPictureComplete]);

  // Filter disabling logic
  const isPlaylistDisabled = !orgData;
  const isSavedCardDisabled = !userId;
  const arePresetsDisabled = isPlaylistDisabled && isSavedCardDisabled;

  // Handle page selection from playlist
  // Handle page selection from playlist
  const handlePageSelect = (bookId: string, chapterId: string, pageId: string, bookTitle: string, chapterName: string, pageTitle: string) => {
    onSelectBookId(bookId);
    onSelectChapterId(chapterId);
    onSelectPageId(pageId);
    onSelectBookTitle(bookTitle);
    onSelectChapterName(chapterName);
    onSelectPageTitle(pageTitle);
  };

  // Override onStartGame to handle playlist page selection
  const handleStartGame = () => {
    // Normal game start - useGame logic handles playlist if selected
    onStartGame();
  };

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    setDraggedQuestion(questionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('questionId', questionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnAnswer = (e: React.DragEvent, answerId: string) => {
    e.preventDefault();
    const questionId = e.dataTransfer.getData('questionId');

    if (questionId) {
      onQuestionDrop(questionId, answerId);

      // Check if it was a wrong drop (mismatch)
      if (questionId !== answerId) {
        setWrongDropId(questionId);
        setTimeout(() => setWrongDropId(null), 1000);
      }
    }
    setDraggedQuestion(null);
  };

  const handleSelectQuestion = (id: string) => {
    if (selectedQuestionId === id) {
      setSelectedQuestionId(null);
    } else {
      setSelectedQuestionId(id);
    }
  };

  const handleAnswerClick = (answerId: string) => {
    if (selectedQuestionId) {
      onQuestionDrop(selectedQuestionId, answerId);

      // Check for wrong drop
      if (selectedQuestionId !== answerId) {
        setWrongDropId(selectedQuestionId);
        setTimeout(() => setWrongDropId(null), 1000);
      }

      setSelectedQuestionId(null);
    }
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    onSpeakHint(text);
  };

  const formatTime = (seconds: number): string => {
    // If contest, just show seconds if < 60 maybe? Or standard "Time: XXs"
    // The requirement says "similar to the way it is shown in the 'matching' mode".
    // Matching mode (Level 1) shows "Time: XXs"
    if (isContest) {
      return `${seconds}s`; // Simplified for countdown
    }
    // Default elapsed time formatting
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} `;
  };

  return (
    <>
      {showCelebration && <Confetti />}

      {/* Loading Screen for Playlist Page Fetch */}
      {/* Loading Screen for Playlist Page Fetch */}
      {/* {isLoadingPlaylistPage && (...)} */}

      <div className="flex flex-col w-full">
        <div className="flex flex-col lg:flex-row w-full p-4 gap-4 lg:p-6 lg:gap-6 relative min-h-[85vh]">
          {/* Toggle Button */}
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="absolute top-4 left-4 z-50 p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white shadow-lg transition-colors border border-slate-600"
            aria-label={isLeftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          {/* Side Panel: 15% width when open, hidden when closed */}
          {isLeftPanelOpen && (
            <div className="w-full lg:w-[15%] flex-shrink-0 transition-all duration-300 ease-in-out">
              <SidePanel
                languages={languages}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={onSelectLanguage}
                currentCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
                currentFos={selectedFos}
                onSelectFos={onSelectFos}
                objectCategories={objectCategories}
                fieldsOfStudy={fieldsOfStudy}
                areCategoriesLoading={areCategoriesLoading}
                currentDifficulty={difficulty}
                onSelectDifficulty={onSelectDifficulty}
                onStartGame={handleStartGame}
                // onStartPlaylistGame={onStartPlaylistGame}
                onWithdrawRequest={onWithdrawRequest}
                gameState={gameState}
                standardPlaylists={standardPlaylists}
                selectedPlaylist={selectedPlaylist}
                onSelectPlaylist={handleSelectPlaylist}
                myTubSheets={myTubSheets}
                selectedTubSheet={selectedTubSheet}
                onSelectTubSheet={handleSelectTubSheet}
                searchKeyword={searchKeyword}
                onSearchKeywordChange={onSearchKeywordChange}
                onSearch={handleSearch}
                selectedPageId={selectedPageId}
                onPageSelect={handlePageSelect}
                expandedSection={expandedSection}
                onExpandedSectionChange={setExpandedSection}
                arePresetsDisabled={arePresetsDisabled}
                isPlaylistDisabled={isPlaylistDisabled}
                isSavedCardDisabled={isSavedCardDisabled}
              />
            </div>
          )}

          {/* Left Panel (Questions): Adjust width based on side panel */}
          <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[28%]' : 'lg:w-[30%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
            <header className="text-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-300">Questions</h2>
              <p className="text-slate-400 text-xs">Drag questions to matching answers</p>
            </header>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 flex-grow content-start">
              {pictureData.questions.map((question, index) => {
                const isMatched = pictureData.matchedQuestions.has(question.id);
                const isDragging = draggedQuestion === question.id;
                const isWrong = wrongDropId === question.id;


                return (
                  <div
                    key={question.id}
                    draggable={!isMatched}
                    onDragStart={(e) => !isMatched && handleDragStart(e, question.id)}
                    onClick={() => !isMatched && handleSelectQuestion(question.id)}
                    className={`relative px-3 py-3 rounded-xl border shadow-sm transition-all duration-200 text-sm flex items-center justify-between gap-2 min-h-[60px] group ${isMatched
                      ? 'opacity-40 bg-green-100 border-green-500 cursor-not-allowed scale-95'
                      : isDragging
                        ? 'opacity-50 border-blue-500 bg-slate-300'
                        : isWrong
                          ? 'border-red-500 bg-red-200 animate-shake'
                          : selectedQuestionId === question.id
                            ? 'ring-4 ring-yellow-400 bg-blue-100 border-yellow-500 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.5)] z-20'
                            : 'bg-slate-200 hover:bg-slate-300 border-slate-300 cursor-grab active:cursor-grabbing hover:scale-105'
                      } `}
                  >
                    {/* Number Label */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10 ${isMatched ? 'bg-green-600' : 'bg-blue-500'}`}>
                      {index + 1}
                    </div>
                    <p className={`flex-grow pl-8 ${isMatched ? 'text-green-800 italic' : selectedQuestionId === question.id ? 'font-extrabold text-blue-900 text-base' : 'font-medium text-slate-800'}`}>{question.question}</p>
                    {!isMatched && (
                      <button
                        onClick={(e) => handleSpeak(e, question.question)}
                        className="p-1.5 rounded-full text-slate-500 hover:bg-slate-400/50 hover:text-slate-900 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Speak question"
                      >
                        <SpeakerIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Panel (Answers): Adjust width based on side panel */}
          <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[28%]' : 'lg:w-[30%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
            <header className="text-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-300">Answers</h2>
              <p className="text-slate-400 text-xs mb-3">Drop questions here</p>

              <div className="flex items-center justify-center gap-6 py-2 px-4 bg-slate-700/50 rounded-lg border border-slate-600 shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Score</span>
                  <span className="text-xl font-black text-yellow-400 leading-none">{score}</span>
                </div>
                <div className="w-px h-8 bg-slate-600"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Time Left</span>
                  <span className={`text-2xl font-black tabular-nums leading-none ${isContest && elapsedTime < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 flex-grow content-start">
              {pictureData.answers.map((answer, index) => {
                const isMatched = pictureData.matchedQuestions.has(answer.id);

                return (
                  <div
                    key={answer.id}
                    onDragOver={!isMatched ? handleDragOver : undefined}
                    onDrop={!isMatched ? (e) => handleDropOnAnswer(e, answer.id) : undefined}
                    onClick={() => !isMatched && handleAnswerClick(answer.id)}
                    className={`relative px-3 py-3 rounded-xl border shadow-sm transition-all duration-200 min-h-[60px] flex items-center justify-center text-center group ${isMatched
                      ? 'bg-green-200 border-green-500'
                      : 'bg-blue-100 border-blue-200 border-dashed hover:bg-blue-200 hover:border-blue-400 cursor-pointer'
                      } `}
                  >
                    {isMatched ? (
                      <div className="w-full">
                        {/* Letter Label (Matched) */}
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <p className="text-xs text-green-700 mb-1 font-semibold">Matched!</p>
                        <div className="flex items-center justify-between gap-2 w-full px-1">
                          <p className="text-slate-800 font-bold text-sm pl-8">{answer.answer}</p>
                          <button
                            onClick={(e) => handleSpeak(e, answer.answer)}
                            className="p-1 rounded-full text-green-700 hover:bg-green-300/50 hover:text-green-900 transition-colors flex-shrink-0"
                            aria-label="Speak answer"
                          >
                            <SpeakerIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 w-full px-1">
                        {/* Letter Label (Unmatched) */}
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <p className="text-slate-800 font-medium text-sm pl-8">{answer.answer}</p>
                        <button
                          onClick={(e) => handleSpeak(e, answer.answer)}
                          className="p-1 rounded-full text-slate-500 hover:bg-slate-400/50 hover:text-slate-900 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          aria-label="Speak answer"
                        >
                          <SpeakerIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel (Picture): Adjust width based on side panel */}
          <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[29%]' : 'lg:w-[40%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
            <header className="text-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-300">Picture</h2>
            </header>

            <div className="flex-grow flex items-start justify-center bg-black/20 rounded-lg p-2 overflow-hidden min-h-0">
              <img
                src={pictureData.imageUrl}
                alt={pictureData.imageName}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                onLoad={onImageLoaded}
              />
            </div>

            <div className="mt-4 text-center">
              {/* Hidden name until complete? Or show it? Requirement says "show that picture fully covering the right panel".
                   Usually picture name is a giveaway for "What is the name?" question.
                   Let's hide it or show a hint? The mock data has "What is the name of this object?" question.
                   So we should probably NOT show the name explicitly. */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Level2View;
