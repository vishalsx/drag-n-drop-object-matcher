import React from 'react';

interface MasteryGaugeProps {
    score: number; // 0 to 100
    coverage: number; // 0 to 100 (vocabulary)
    label: string;
    change: number; // e.g. +5 or -2
    period: string; // e.g. "this week"
    wordsExposed?: number;
    totalWords?: number;
}

const MasteryGauge: React.FC<MasteryGaugeProps> = ({ score, coverage, label, change, period, wordsExposed = 0, totalWords = 0 }) => {
    // SVG parameters
    const size = 180; // Slightly larger for dual circles
    const center = size / 2;

    // Outer Circle (Coverage)
    const strokeOuter = 10;
    const radiusOuter = (size - strokeOuter) / 2 - 2;
    const circumferenceOuter = 2 * Math.PI * radiusOuter;
    const offsetOuter = circumferenceOuter - (coverage / 100) * circumferenceOuter;

    // Inner Circle (Mastery)
    const strokeInner = 10;
    const radiusInner = radiusOuter - strokeOuter - 6;
    const circumferenceInner = 2 * Math.PI * radiusInner;
    const offsetInner = circumferenceInner - (score / 100) * circumferenceInner;

    const isPositive = change >= 0;

    // Dynamic Color Logic for Exposure
    let coverageColorClass = "text-emerald-400"; // Default > 75
    let coverageGradientId = "coverageGradientGreen"; // Default

    if (coverage < 50) {
        coverageColorClass = "text-red-500 animate-pulse";
        coverageGradientId = "coverageGradientRed";
    } else if (coverage >= 50 && coverage <= 75) {
        coverageColorClass = "text-amber-500";
        coverageGradientId = "coverageGradientAmber";
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 transition-all duration-300 group shadow-lg">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</h3>

            <div className="relative flex items-center justify-center">
                <svg width={size} height={size} className="transform -rotate-90">
                    <defs>
                        <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>

                        {/* Green Gradient (>75%) */}
                        <linearGradient id="coverageGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>

                        {/* Amber Gradient (50-75%) */}
                        <linearGradient id="coverageGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>

                        {/* Red Gradient (<50%) */}
                        <linearGradient id="coverageGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f87171" />
                        </linearGradient>
                    </defs>

                    {/* Background Circles */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radiusOuter}
                        stroke="currentColor"
                        strokeWidth={strokeOuter}
                        fill="transparent"
                        className="text-slate-700/30"
                    />
                    <circle
                        cx={center}
                        cy={center}
                        r={radiusInner}
                        stroke="currentColor"
                        strokeWidth={strokeInner}
                        fill="transparent"
                        className="text-slate-700/30"
                    />

                    {/* Outer Progress (Exposure - Dynamic Color) */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radiusOuter}
                        stroke={`url(#${coverageGradientId})`}
                        strokeWidth={strokeOuter}
                        fill="transparent"
                        strokeDasharray={circumferenceOuter}
                        strokeDashoffset={offsetOuter}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ease-out ${coverage < 50 ? 'animate-pulse' : ''}`}
                    />

                    {/* Inner Progress (Mastery - Blue/Indigo) */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radiusInner}
                        stroke="url(#masteryGradient)"
                        strokeWidth={strokeInner}
                        fill="transparent"
                        strokeDasharray={circumferenceInner}
                        strokeDashoffset={offsetInner}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-3xl font-bold text-white group-hover:scale-105 transition-transform">
                            {score}%
                        </span>
                        <span className="text-[10px] text-blue-400 font-bold mt-1 uppercase">Mastery Score</span>
                    </div>
                </div>
            </div>

            {/* Metrics Legend */}
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
                <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Exploration</span>
                    <span className={`text-lg font-bold leading-none ${coverageColorClass}`}>{coverage}%</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Accuracy</span>
                    <span className="text-lg font-bold text-blue-400 leading-none">{score}%</span>
                </div>
            </div>

            {/* Change Indicator */}
            <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    <svg
                        className={`w-3 h-3 ${!isPositive ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                    {Math.abs(change)}%
                </div>
                <span className="text-slate-500 text-xs font-medium">{period}</span>
            </div>

            {/* Word Count Stats */}
            {totalWords > 0 && (
                <div className="w-full text-center mt-1 pt-2 border-t border-slate-700/30">
                    <span className="text-xs text-slate-400">
                        Words: <span className="text-white font-semibold">{wordsExposed}</span> / {totalWords}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MasteryGauge;
