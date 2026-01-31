import React, { useMemo, useState, useEffect } from 'react';
import Confetti from '../components/Confetti';
import { contestService } from '../services/contestService';

import { authService } from '../services/authService';
import { LeaderboardEntry, LeaderboardResponse } from '../types/contestTypes';

interface ContestScore {
    level: number;
    round: number;
    language: string;
    score: number;
    time_taken?: number;
}

interface LanguageInfo {
    code: string;
    name: string;
}

interface ContestSummaryScreenProps {
    contestScores: ContestScore[];
    contestName?: string;
    currentLanguage?: string;
    languages?: LanguageInfo[];
    contestId?: string;
    onClose: () => void;
    nextLanguageName?: string;
    onNextRound?: () => void;
}

const ContestSummaryScreen: React.FC<ContestSummaryScreenProps> = ({
    contestScores,
    contestName = 'Contest',
    contestId,
    languages = [],
    onClose,
    nextLanguageName,
    onNextRound
}) => {
    const totalScore = (contestScores || []).reduce((acc, curr) => acc + (curr.score || 0), 0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
    const [backendSummary, setBackendSummary] = useState<{ total_score: number; breakdown: any[] } | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    // Helper function to convert language code/value to proper language name
    const getLanguageName = (langCodeOrName: string): string => {
        if (!langCodeOrName) return langCodeOrName;

        // Try to find in languages array by code or name (case-insensitive)
        const langObj = languages.find(l =>
            l.code?.toLowerCase() === langCodeOrName.toLowerCase() ||
            l.name?.toLowerCase() === langCodeOrName.toLowerCase()
        );

        // Return the full language name if found, otherwise return as-is
        return langObj?.name || langCodeOrName;
    };

    useEffect(() => {
        const fetchSummary = async () => {
            const username = authService.getUsername();
            if (contestId && username) {
                setIsLoadingSummary(true);
                try {
                    const data = await contestService.getParticipantSummary(contestId, username);
                    setBackendSummary(data);
                } catch (err) {
                    console.error("Failed to fetch participant summary:", err);
                } finally {
                    setIsLoadingSummary(false);
                }
            }
        };
        fetchSummary();
    }, [contestId]);

    // Group scores by language (fallback)
    const localGroupedScores = useMemo(() => {
        const groups: Record<string, { total: number, scores: number[] }> = {};
        (contestScores || []).forEach(item => {
            // Map language to proper name before grouping
            const langName = getLanguageName(item.language);
            if (!groups[langName]) {
                groups[langName] = { total: 0, scores: [] };
            }
            groups[langName].total += (item.score || 0);
            groups[langName].scores.push(item.score || 0);
        });
        return Object.entries(groups).map(([language, data]) => ({
            language,
            total: data.total,
            breakdown: data.scores.join(' + ') + ' = ' + data.total
        }));
    }, [contestScores, languages]);

    const finalGroupedScores = useMemo(() => {
        if (backendSummary) {
            // Map backend language values to proper names
            return backendSummary.breakdown.map(b => ({
                language: getLanguageName(b.language),
                total: b.total,
                breakdown: b.calculation
            }));
        }
        return localGroupedScores;
    }, [backendSummary, localGroupedScores, languages]);

    const finalTotalScore = backendSummary ? backendSummary.total_score : totalScore;

    const finalTotalBreakdown = useMemo(() => {
        if (finalGroupedScores.length <= 1) return null;
        return finalGroupedScores.map(s => s.total).join(' + ') + ' = ' + finalTotalScore;
    }, [finalGroupedScores, finalTotalScore]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (contestId) {
                setIsLoadingLeaderboard(true);
                try {
                    const data: LeaderboardResponse = await contestService.getContestLeaderboard(contestId, 20);
                    setLeaderboard(data.entries);
                } catch (error) {
                    console.error('Failed to load leaderboard:', error);
                } finally {
                    setIsLoadingLeaderboard(false);
                }
            }
        };
        fetchLeaderboard();
    }, [contestId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fadeIn">
            <Confetti />

            <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col transform animate-scaleIn max-h-[90vh]">
                {/* Header Decoration */}
                <div className="p-8 pb-4 text-center flex-shrink-0">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6 text-5xl">
                        🏆
                    </div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-[length:200%_auto] animate-shimmer">
                        Contest Complete!
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium tracking-wide">
                        {contestName}
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="px-8 py-4 flex-grow overflow-y-auto">
                    {/* Your Score Breakdown */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 mb-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Your Performance</h3>

                        <div className="space-y-4">
                            {isLoadingSummary ? (
                                <div className="text-center py-4 text-slate-500 italic">Calculating breakdown...</div>
                            ) : finalGroupedScores.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group p-3 bg-slate-800/40 rounded-xl border border-slate-700/30 hover:bg-slate-800/60 transition-colors">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-teal-500 group-hover:scale-150 transition-transform"></div>
                                            <span className="text-lg text-slate-200 font-bold">{item.language}</span>
                                        </div>
                                        <div className="ml-5 mt-1 text-xs text-slate-400 font-mono tracking-tight">
                                            {item.breakdown}
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-teal-400">{item.total}</span>
                                        <span className="text-slate-500 text-xs">pts</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-white">Your Grand Total</span>
                                    {finalTotalBreakdown && (
                                        <span className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">
                                            {finalTotalBreakdown}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-500">
                                        {finalTotalScore}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Leaderboard - Top Performers</h3>

                        {isLoadingLeaderboard ? (
                            <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading rankings...</span>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            <div className="space-y-2">
                                {leaderboard.map((entry) => (
                                    <div
                                        key={entry.rank}
                                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${entry.is_current_user
                                            ? 'bg-teal-500/20 border border-teal-500/50 scale-105'
                                            : 'bg-slate-800/50 hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${entry.rank === 1 ? 'bg-yellow-500 text-black' :
                                                entry.rank === 2 ? 'bg-gray-300 text-black' :
                                                    entry.rank === 3 ? 'bg-orange-600 text-white' :
                                                        'bg-slate-700 text-slate-300'
                                                }`}>
                                                {entry.rank}
                                            </div>
                                            <span className={`font-medium ${entry.is_current_user ? 'text-teal-300' : 'text-slate-200'}`}>
                                                {entry.username} {entry.is_current_user && '(You)'}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-xl font-bold ${entry.is_current_user ? 'text-teal-400' : 'text-slate-300'}`}>
                                                {entry.total_score}
                                            </span>
                                            <span className="text-slate-500 text-xs">pts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 italic">
                                No rankings available yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 pt-4 flex-shrink-0">
                    {nextLanguageName && onNextRound ? (
                        <button
                            onClick={onNextRound}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 transform hover:scale-[1.02] transition-all active:scale-95 mb-3"
                        >
                            Continue to {nextLanguageName}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-teal-500/20 transform hover:scale-[1.02] transition-all active:scale-95"
                        >
                            Finish Contest
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContestSummaryScreen;
