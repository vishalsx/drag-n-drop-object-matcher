import React, { useState } from 'react';
import type { Level2PictureData } from '../types/level2Types';
import { SpeakerIcon } from '../components/Icons';

interface Level2CompletionScreenProps {
    pictures: Level2PictureData[];
    finalScore: number;
    totalTime: number;
    onClose: () => void;
    onSpeakHint: (text: string) => void;
}

const Level2CompletionScreen: React.FC<Level2CompletionScreenProps> = ({
    pictures,
    finalScore,
    totalTime,
    onClose,
    onSpeakHint,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentPicture = pictures[currentIndex];

    const correctQuestions = currentPicture.questions.filter(q => q.isCorrect);

    const handleNext = () => {
        if (currentIndex < pictures.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSpeak = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        onSpeakHint(text);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col p-6 sm:p-8 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-4xl font-bold text-green-400 text-center">Level 2 Complete!</h2>
                <p className="mt-2 text-lg text-slate-300 text-center">
                    Final Score: <span className="font-bold text-yellow-300">{finalScore}</span> |
                    Total Time: <span className="font-bold text-blue-300">{formatTime(totalTime)}</span>
                </p>

                <div className="flex-grow overflow-y-auto mt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: Picture */}
                        <div className="w-full md:w-1/2 flex flex-col items-center">
                            <div className="w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 p-4 flex items-center justify-center">
                                <img
                                    src={currentPicture.imageUrl}
                                    alt={currentPicture.imageName}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>
                            <h3 className="mt-4 text-2xl font-bold text-teal-300">{currentPicture.imageName}</h3>
                            <p className="text-slate-400 mt-2">
                                Picture {currentIndex + 1} of {pictures.length}
                            </p>
                        </div>

                        {/* Right: Questions & Answers */}
                        <div className="w-full md:w-1/2">
                            <h3 className="text-xl font-bold text-slate-200 mb-4">Correct Questions & Answers</h3>
                            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                                {correctQuestions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="font-semibold text-blue-300">
                                                Q{idx + 1}: {q.question}
                                            </p>
                                            <button
                                                onClick={(e) => handleSpeak(e, q.question)}
                                                className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                                                aria-label="Speak question"
                                            >
                                                <SpeakerIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-slate-300 text-sm">
                                                <span className="text-green-400 font-medium">A:</span> {q.answer}
                                            </p>
                                            <button
                                                onClick={(e) => handleSpeak(e, q.answer)}
                                                className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                                                aria-label="Speak answer"
                                            >
                                                <SpeakerIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                    >
                        ← Previous
                    </button>

                    {currentIndex === pictures.length - 1 ? (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-transform transform hover:scale-105"
                        >
                            Finish
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-transform transform hover:scale-105"
                        >
                            Next →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Level2CompletionScreen;
