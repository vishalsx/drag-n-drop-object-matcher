import React, { useState, useEffect } from 'react';

interface RoundCompletionModalProps {
    levelName: string;
    roundName: string;
    language: string;
    score: number;
    baseScore: number;
    timeBonus: number;
    timeElapsed: number;
    onContinue: () => void;
}

const RoundCompletionModal: React.FC<RoundCompletionModalProps> = ({
    levelName,
    roundName,
    language,
    score,
    baseScore,
    timeBonus,
    timeElapsed,
    onContinue
}) => {
    const [displayScore, setDisplayScore] = useState(baseScore);
    const [showBonus, setShowBonus] = useState(false);

    console.log(`[ScoreDebug] RoundCompletionModal props:`, {
        levelName,
        roundName,
        score,
        baseScore,
        timeBonus,
        timeElapsed
    });

    useEffect(() => {
        if (timeBonus > 0) {
            // Wait a bit then animate
            const timer = setTimeout(() => {
                setShowBonus(true);

                const duration = 1000; // 1 second animation
                const startTime = performance.now();

                const animate = (currentTime: number) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Ease out quadratic
                    const easeProgress = progress * (2 - progress);

                    const currentDisplay = Math.round(baseScore + (timeBonus * easeProgress));
                    setDisplayScore(currentDisplay);

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };

                requestAnimationFrame(animate);
            }, 800);

            return () => clearTimeout(timer);
        } else {
            setDisplayScore(score);
        }
    }, [baseScore, timeBonus, score]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full p-8 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 via-teal-400 to-blue-500"></div>

                <div className="mb-6">
                    <div className="mx-auto w-20 h-20 bg-green-900/50 rounded-full flex items-center justify-center border-4 border-green-500/30 mb-4 text-4xl">
                        ✅
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Round Complete!</h2>
                    <p className="text-slate-400">
                        {levelName} - {roundName}
                    </p>
                    <p className="text-teal-400 font-semibold text-lg">
                        {language}
                    </p>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-6 mb-8 border border-slate-600 space-y-4">
                    <div className="relative">
                        <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-5xl font-bold text-yellow-400 transition-all duration-300 transform scale-110">
                            {displayScore}
                        </p>

                        {timeBonus > 0 && (
                            <div className={`mt-2 flex flex-col items-center transition-all duration-500 ${showBonus ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                                <div className="text-sm font-medium text-green-400 flex items-center gap-1">
                                    <span>Time Bonus:</span>
                                    <span className="bg-green-500/20 px-2 py-0.5 rounded text-xs">+{Math.round(timeBonus)}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 italic mt-1">(Base: {Math.round(baseScore)})</div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-600 pt-4">
                        <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Time Taken</p>
                        <p className="text-2xl font-semibold text-blue-400">
                            {(() => {
                                const mins = Math.floor(timeElapsed / 60);
                                const secs = Math.round(timeElapsed % 60);
                                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                            })()}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onContinue}
                    className="px-8 py-3 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-400 hover:to-green-400 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all w-full"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default RoundCompletionModal;
