import React, { useEffect, useState } from 'react';

interface ResumeNotificationProps {
    isVisible: boolean;
    level: number;
    round: number;
    score: number;
    attemptsLeft: number | null;
    onClose: () => void;
}

export const ResumeNotification: React.FC<ResumeNotificationProps> = ({
    isVisible,
    level,
    round,
    score,
    attemptsLeft,
    onClose
}) => {
    const [show, setShow] = useState(isVisible);

    useEffect(() => {
        setShow(isVisible);
        if (isVisible) {
            const timer = setTimeout(() => {
                setShow(false);
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!show) return null;

    return (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
            <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-2 min-w-[300px]">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-tight text-center">Attempt Summary</h3>
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-wider text-center">Session Progress</p>
                    </div>
                </div>

                <div className="w-full h-px bg-white/10 my-2"></div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full">
                    <div className="flex justify-between text-slate-400">
                        <span>Level:</span>
                        <span className="text-white font-bold">{level}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Round:</span>
                        <span className="text-white font-bold">{round}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Current Score:</span>
                        <span className="text-emerald-400 font-bold">{score}</span>
                    </div>
                    {attemptsLeft !== null && (
                        <div className="flex justify-between text-slate-400">
                            <span>Attempts Left:</span>
                            <span className={`${attemptsLeft <= 1 ? 'text-red-400' : 'text-orange-400'} font-bold`}>{attemptsLeft}</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => { setShow(false); onClose(); }}
                    className="mt-3 text-xs text-slate-500 hover:text-white transition-colors"
                >
                    Dismiss
                </button>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};
