import React from 'react';

interface ContestTransitionModalProps {
    currentLanguage: string;
    nextLanguage: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

const ContestTransitionModal: React.FC<ContestTransitionModalProps> = ({ currentLanguage, nextLanguage, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full p-8 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-teal-400 to-green-500"></div>

                <div className="mb-6">
                    <div className="mx-auto w-20 h-20 bg-green-900/50 rounded-full flex items-center justify-center border-4 border-green-500/30 mb-4 text-4xl">
                        🎉
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Awesome Job!</h2>
                    <p className="text-slate-400">
                        You've completed the <span className="text-teal-400 font-semibold">{currentLanguage}</span> round.
                    </p>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-6 mb-8 border border-slate-600">
                    <p className="text-slate-300 text-sm uppercase tracking-wider mb-2 font-semibold">Up Next</p>
                    <h3 className="text-3xl font-bold text-yellow-400 mb-1">{nextLanguage}</h3>
                    <p className="text-slate-400 text-sm">Are you ready to continue?</p>
                </div>

                <div className="flex gap-4 justify-center">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-8 py-3 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-400 hover:to-green-400 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all w-full md:w-auto"
                    >
                        Start Next Round
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContestTransitionModal;
