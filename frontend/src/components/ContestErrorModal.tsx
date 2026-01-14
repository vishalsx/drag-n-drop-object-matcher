import React from 'react';

interface ContestErrorModalProps {
    error: string;
    onExit: () => void;
}

const ContestErrorModal: React.FC<ContestErrorModalProps> = ({ error, onExit }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-red-500/50 max-w-lg w-full p-8 text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>

                <div className="mb-6">
                    <div className="mx-auto w-20 h-20 bg-red-900/50 rounded-full flex items-center justify-center border-4 border-red-500/30 mb-4 text-4xl">
                        ⚠️
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 text-lg">
                        We cannot start this contest.
                    </p>
                </div>

                <div className="bg-red-900/20 rounded-xl p-6 mb-8 border border-red-900/50">
                    <p className="text-red-300 font-medium text-lg">
                        {error}
                    </p>
                </div>

                <button
                    onClick={onExit}
                    className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl shadow-lg transition-all border border-slate-600 hover:border-slate-500"
                >
                    Return to Home
                </button>
            </div>
        </div>
    );
};

export default ContestErrorModal;
