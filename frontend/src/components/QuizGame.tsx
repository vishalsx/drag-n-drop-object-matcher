import React, { useState, useEffect, useRef } from 'react';

import type { QuizScoringParameters } from '../types/contestTypes';

interface QuizQuestion {
    translation_id: string;
    object_id: string;
    object_name: string;
    question: string;
    answer: string;
    difficulty_level?: 'low' | 'medium' | 'high' | 'very_high';
}

interface QuizGameProps {
    questions: QuizQuestion[];
    onComplete: (score: number, correctCount: number, timeLeftSeconds: number) => void;
    timeLimitSeconds: number;
    initialTimeSeconds?: number;
    onTimeUpdate?: (secondsLeft: number) => void;
    scoringParams?: QuizScoringParameters;
    timerMode?: 'countdown' | 'elapsed';
}

const QuizGame: React.FC<QuizGameProps> = ({
    questions,
    onComplete,
    timeLimitSeconds,
    initialTimeSeconds = 0,
    onTimeUpdate,
    scoringParams,
    timerMode = 'countdown'
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    // For countdown, start with limit. For elapsed, start with initialTime (usually 0).
    const [timeLeft, setTimeLeft] = useState(timerMode === 'countdown' ? timeLimitSeconds : initialTimeSeconds);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [gameActive, setGameActive] = useState(true);

    const timeLeftRef = useRef(timeLeft);
    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (!gameActive) return;

        console.log(`[QuizGame] Starting timer (${timerMode}) with ${timeLeft}s`);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (timerMode === 'countdown') {
                    if (prev <= 0) {
                        console.log('[QuizGame] Timer reached 0. Completing...');
                        clearInterval(timer);
                        handleComplete();
                        return 0;
                    }
                    const nextVal = prev - 1;
                    if (onTimeUpdate) onTimeUpdate(nextVal);
                    return nextVal;
                } else {
                    // Elapsed mode (Learners)
                    const nextVal = prev + 1;
                    if (onTimeUpdate) onTimeUpdate(nextVal);
                    return nextVal;
                }
            });
        }, 1000);

        return () => {
            console.log('[QuizGame] Clearing timer.');
            clearInterval(timer);
        };
    }, [gameActive, onTimeUpdate, timerMode]);

    const handleComplete = () => {
        console.log('[QuizGame] handleComplete triggered. Final Score:', score, 'Time Left:', timeLeftRef.current);
        setGameActive(false);
        onComplete(score, correctCount, timeLeftRef.current);
    };

    const submitAnswer = () => {
        if (!userAnswer.trim()) return;

        const currentQ = questions[currentIndex];
        // Simple case-insensitive string match for now. 
        // Enhance with fuzzy matching if needed later.
        const correct = userAnswer.trim().toLowerCase() === currentQ.answer.toLowerCase();

        setIsCorrect(correct);
        setShowFeedback(true);

        if (correct) {
            let points = scoringParams?.base_points ?? 10;

            // Apply difficulty multiplier if weights are available
            if (scoringParams?.difficulty_weights && currentQ.difficulty_level) {
                const diffKey = currentQ.difficulty_level.toLowerCase() as keyof typeof scoringParams.difficulty_weights;
                const multiplier = scoringParams.difficulty_weights[diffKey] || 1;
                points = Math.round(points * multiplier);
            }

            setScore(prev => prev + points);
            setCorrectCount(prev => prev + 1);
        } else {
            // Apply negative marking if configured
            const penalty = scoringParams?.negative_marking || 0;
            if (penalty > 0) {
                setScore(prev => Math.max(0, prev - penalty));
            }
        }

        setTimeout(() => {
            setShowFeedback(false);
            setUserAnswer('');
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                handleComplete();
            }
        }, 1500);
    };

    if (!gameActive) {
        return <div className="text-white text-center text-2xl">Quiz Complete! Score: {score}</div>;
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-8 text-slate-200">
            <div className="mb-4 flex flex-col items-center w-full max-w-2xl">
                <div className="flex justify-between w-full text-xl font-bold mb-2">
                    <span>Question {currentIndex + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-8 py-2 px-6 bg-slate-800/80 rounded-full border border-slate-700 shadow-xl">
                    <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Total Score</span>
                        <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">{score}</span>
                    </div>
                    <div className="w-px h-10 bg-slate-700"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Time Remaining</span>
                        <span className={`text-4xl font-black tabular-nums drop-shadow-md ${timeLeft < 10 ? "text-red-500 animate-pulse" : "text-teal-400"}`}>
                            {timeLeft}s
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-2xl border border-slate-700">
                <div className="mb-2 text-sm text-slate-400 uppercase tracking-wider">Difficulty: {currentQ.difficulty_level || 'medium'}</div>
                <h3 className="text-2xl font-semibold mb-6 text-white">{currentQ.question}</h3>

                {showFeedback ? (
                    <div className={`p-4 rounded-lg text-center text-xl font-bold ${isCorrect ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
                        {isCorrect ? 'Correct!' : `Incorrect! Answer: ${currentQ.answer}`}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                            placeholder="Type your answer..."
                            className="p-4 rounded-lg bg-slate-900 border border-slate-600 text-white focus:border-teal-500 focus:outline-none transition-colors"
                            autoFocus
                        />
                        <button
                            onClick={submitAnswer}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
                        >
                            Submit Answer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizGame;
