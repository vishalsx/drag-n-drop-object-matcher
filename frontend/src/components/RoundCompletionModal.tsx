import React from 'react';

interface RoundCompletionModalProps {
    levelName: string;
    roundName: string;
    language: string;
    score: number;
    timeElapsed: number;
    onContinue: () => void;
}

const RoundCompletionModal: React.FC<RoundCompletionModalProps> = ({
    levelName,
    roundName,
    language,
    score,
    timeElapsed,
    onContinue
}) => {
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
                    <div>
                        <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Score</p>
                        <p className="text-4xl font-bold text-yellow-400">{score}</p>
                    </div>
                    <div className="border-t border-slate-600 pt-4">
                        <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Time Taken</p>
                        <p className="text-2xl font-semibold text-blue-400">{timeElapsed}s</p>
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
