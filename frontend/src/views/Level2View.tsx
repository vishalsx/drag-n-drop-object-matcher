
import React, { useState, useEffect } from 'react';
import type { Level2PictureData } from '../types/level2Types';
import Confetti from '../components/Confetti';
import { SpeakerIcon, MenuIcon } from '../components/Icons';
import SidePanel from '../components/SidePanel';
import type { Language, CategoryFosItem, Difficulty } from '../types/types';

interface Level2ViewProps {
  pictureData: Level2PictureData;
  score: number;
  elapsedTime: number;
  onQuestionDrop: (questionId: string, targetAnswerId: string) => void;
  onPictureComplete: () => void;
  onSpeakHint: (text: string) => void;

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
}) => {
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wrongDropId, setWrongDropId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);

  const remainingQuestions = pictureData.questions.filter(
    q => q.isCorrect && !pictureData.matchedQuestions.has(q.id)
  );

  useEffect(() => {
    if (remainingQuestions.length === 0 && pictureData.matchedQuestions.size > 0) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        onPictureComplete();
      }, 3000);
    }
  }, [remainingQuestions.length, pictureData.matchedQuestions.size, onPictureComplete]);

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

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    onSpeakHint(text);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} `;
  };

  return (
    <>
      {showCelebration && <Confetti />}

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
                onStartGame={onStartGame}
                onWithdrawRequest={onWithdrawRequest}
                gameState={gameState}
              />
            </div>
          )}

          {/* Left Panel (Questions): Adjust width based on side panel */}
          <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[28%]' : 'lg:w-[30%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
            <header className="text-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-300">Questions</h2>
              <p className="text-slate-400 text-xs">Drag questions to matching answers</p>
            </header>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 flex-grow content-center">
              {pictureData.questions.map((question, index) => {
                const isMatched = pictureData.matchedQuestions.has(question.id);
                const isDragging = draggedQuestion === question.id;
                const isWrong = wrongDropId === question.id;

                // Hide matched questions from the list
                if (isMatched) return null;

                return (
                  <div
                    key={question.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, question.id)}
                    className={`relative px-3 py-2 rounded-xl border shadow-sm transition-all duration-200 text-sm flex items-center justify-between gap-2 group ${isDragging
                      ? 'opacity-50 border-blue-500 bg-slate-300'
                      : isWrong
                        ? 'border-red-500 bg-red-200 animate-shake'
                        : 'bg-slate-200 hover:bg-slate-300 border-slate-300 cursor-grab active:cursor-grabbing hover:scale-105'
                      } `}
                  >
                    {/* Number Label */}
                    {/* Number Label */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
                      {index + 1}
                    </div>
                    <p className="text-slate-800 font-medium flex-grow pl-8">{question.question}</p>
                    <button
                      onClick={(e) => handleSpeak(e, question.question)}
                      className="p-1.5 rounded-full text-slate-500 hover:bg-slate-400/50 hover:text-slate-900 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label="Speak question"
                    >
                      <SpeakerIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Panel (Answers): Adjust width based on side panel */}
          <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[28%]' : 'lg:w-[30%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
            <header className="text-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-300">Answers</h2>
              <p className="text-slate-400 text-xs">Drop questions here</p>
            </header>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 flex-grow content-center">
              {pictureData.answers.map((answer, index) => {
                const isMatched = pictureData.matchedQuestions.has(answer.id);

                return (
                  <div
                    key={answer.id}
                    onDragOver={!isMatched ? handleDragOver : undefined}
                    onDrop={!isMatched ? (e) => handleDropOnAnswer(e, answer.id) : undefined}
                    className={`relative px-3 py-3 rounded-xl border shadow-sm transition-all duration-200 min-h-[60px] flex items-center justify-center text-center group ${isMatched
                      ? 'bg-green-200 border-green-500'
                      : 'bg-blue-100 border-blue-200 border-dashed hover:bg-blue-200 hover:border-blue-400'
                      } `}
                  >
                    {isMatched ? (
                      <div className="w-full">
                        {/* Letter Label (Matched) */}
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <p className="text-xs text-green-700 mb-1 font-semibold">Matched!</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-slate-800 font-bold text-sm">{answer.answer}</p>
                          <button
                            onClick={(e) => handleSpeak(e, answer.answer)}
                            className="p-1 rounded-full text-green-700 hover:bg-green-300/50 hover:text-green-900 transition-colors"
                            aria-label="Speak answer"
                          >
                            <SpeakerIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 w-full">
                        {/* Letter Label (Unmatched) */}
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold shadow-md border border-white z-10">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <p className="text-slate-800 font-medium text-sm">{answer.answer}</p>
                        <button
                          onClick={(e) => handleSpeak(e, answer.answer)}
                          className="p-1 rounded-full text-slate-500 hover:bg-slate-400/50 hover:text-slate-900 transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="mt-2 flex justify-center gap-4 text-sm">
                <div className="text-yellow-400 font-bold">Score: {score}</div>
                <div className="text-blue-400 font-bold">Time: {formatTime(elapsedTime)}</div>
              </div>
            </header>

            <div className="flex-grow flex items-center justify-center bg-black/20 rounded-lg p-2 overflow-hidden">
              <img
                src={pictureData.imageUrl}
                alt={pictureData.imageName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
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
