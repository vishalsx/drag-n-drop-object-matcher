import React, { useState, useEffect, useMemo } from 'react';
import { Organisation } from '../services/routingService';
import { contestService } from '../services/contestService';
import { Contest, LeaderboardEntry, LeaderboardResponse } from '../types/contestTypes';
import { SpinnerIcon } from '../components/Icons';

interface ContestDashboardProps {
    orgData: Organisation;
}

const ContestDashboard: React.FC<ContestDashboardProps> = ({ orgData }) => {
    const [contests, setContests] = useState<Contest[]>([]);
    const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [averageTime, setAverageTime] = useState<number>(0);
    const [isLoadingContests, setIsLoadingContests] = useState(true);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    useEffect(() => {
        const fetchContests = async () => {
            if (orgData.org_id) {
                const data = await contestService.getContestsByOrg(orgData.org_id);
                setContests(data);
                setIsLoadingContests(false);
            }
        };
        fetchContests();
    }, [orgData.org_id]);

    const { activeContests, otherContests } = useMemo(() => {
        const active = contests
            .filter(c => c.status === 'Active' || c.status === 'Published')
            .sort((a, b) => new Date(a.contest_start_at).getTime() - new Date(b.contest_start_at).getTime());

        const others = contests
            .filter(c => c.status !== 'Active' && c.status !== 'Published')
            .sort((a, b) => new Date(b.contest_end_at).getTime() - new Date(a.contest_end_at).getTime());

        return { activeContests: active, otherContests: others };
    }, [contests]);

    // Set initial selected contest
    useEffect(() => {
        if (!selectedContest && !isLoadingContests) {
            if (activeContests.length > 0) {
                setSelectedContest(activeContests[0]);
            } else if (otherContests.length > 0) {
                setSelectedContest(otherContests[0]);
            }
        }
    }, [activeContests, otherContests, isLoadingContests, selectedContest]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (selectedContest?.id || selectedContest?._id) {
                const contestId = (selectedContest.id || selectedContest._id) as string;
                setIsLoadingLeaderboard(true);
                try {
                    const data: LeaderboardResponse = await contestService.getContestLeaderboard(contestId, 20);
                    setLeaderboard(data.entries);
                    setAverageTime(data.average_time_all_participants);
                } catch (error) {
                    console.error('Failed to fetch leaderboard:', error);
                } finally {
                    setIsLoadingLeaderboard(false);
                }
            }
        };
        fetchLeaderboard();
    }, [selectedContest]);

    const handlePlayContest = (contest: Contest) => {
        const contestId = contest.id || contest._id;
        window.location.href = `/${orgData.org_code}/contest/${contestId}`;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Top Row: Organisation Info */}
            <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {orgData.logo_url && (
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-inner overflow-hidden">
                            <img src={orgData.logo_url} alt={orgData.org_name} className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white">{orgData.org_name}</h1>
                        <p className="text-slate-400 text-sm font-medium">Contest Dashboard</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                        {orgData.org_type} Organization
                    </span>
                </div>
            </div>

            {/* Main Content: 2-Panel Layout */}
            <div className="flex flex-1 overflow-hidden p-6 gap-6">
                {/* Left Panel: Contest List */}
                <div className="w-[45%] flex flex-col bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h2 className="text-xl font-bold uppercase tracking-tight">Active Contests</h2>
                        <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                            {contests.length} {contests.length === 1 ? 'Contest' : 'Contests'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {isLoadingContests ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                                <SpinnerIcon className="w-8 h-8 animate-spin" />
                                <span className="font-medium uppercase tracking-widest text-[10px]">Loading contests...</span>
                            </div>
                        ) : (activeContests.length > 0 || otherContests.length > 0) ? (
                            <div className="space-y-8">
                                {activeContests.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 pl-1 mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                            Active & Upcoming
                                        </h3>
                                        <div className="space-y-3">
                                            {activeContests.map((contest) => (
                                                <ContestCard
                                                    key={contest.id || contest._id}
                                                    contest={contest}
                                                    isActive={selectedContest?.id === contest.id || selectedContest?._id === contest._id}
                                                    onSelect={() => setSelectedContest(contest)}
                                                    onPlay={() => handlePlayContest(contest)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherContests.length > 0 && (
                                    <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1 mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                            Past & Other
                                        </h3>
                                        <div className="space-y-3">
                                            {otherContests.map((contest) => (
                                                <ContestCard
                                                    key={contest.id || contest._id}
                                                    contest={contest}
                                                    isActive={selectedContest?.id === contest.id || selectedContest?._id === contest._id}
                                                    onSelect={() => setSelectedContest(contest)}
                                                    onPlay={() => handlePlayContest(contest)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 italic text-center px-10">
                                No contests available for this organization.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Leaderboard */}
                <div className="flex-1 flex flex-col bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                            🏆 Leaderboard
                            {selectedContest && (
                                <span className="text-slate-500 text-sm font-normal lowercase tracking-normal bg-slate-800 px-3 py-0.5 rounded-full ml-2">
                                    {selectedContest.name.en || selectedContest.name.English}
                                </span>
                            )}
                        </h2>
                        {averageTime > 0 && (
                            <div className="mt-3 flex items-center gap-4">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 flex items-center gap-3">
                                    <span className="text-blue-400 text-sm font-bold uppercase tracking-wider">Avg Time</span>
                                    <span className="text-white text-lg font-black">{Math.round(averageTime)}s</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {!selectedContest ? (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">
                                Select a contest to view rankings
                            </div>
                        ) : isLoadingLeaderboard ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                                <SpinnerIcon className="w-10 h-10 animate-spin text-blue-500" />
                                <span className="font-medium uppercase tracking-widest text-[10px]">Fetching top ranks...</span>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            <div className="space-y-2">
                                {leaderboard.map((entry) => (
                                    <div
                                        key={entry.rank}
                                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${entry.is_current_user
                                            ? 'bg-blue-600/20 border border-blue-500/50 shadow-xl shadow-blue-600/5'
                                            : 'bg-slate-800/30 border border-slate-800/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 shadow-lg shadow-yellow-500/20' :
                                                entry.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-lg shadow-slate-300/20' :
                                                    entry.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white shadow-lg shadow-orange-500/20' :
                                                        'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}>
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <span className={`text-lg font-bold block ${entry.is_current_user ? 'text-blue-300' : 'text-slate-100'}`}>
                                                    {entry.username}
                                                </span>
                                                {entry.is_current_user && (
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">Your Rank</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-3xl font-black ${entry.rank <= 3 ? 'text-white' : 'text-slate-300'}`}>
                                                    {entry.total_score}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Pts</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap justify-end">
                                                {Object.entries(entry.language_scores || {}).map(([lang, score]) => (
                                                    <span key={lang} className="text-[10px] px-2 py-1 bg-slate-800/80 rounded-lg text-slate-400 font-medium border border-slate-700/50 flex flex-col items-center min-w-[60px]">
                                                        <span className="text-[8px] uppercase tracking-tighter opacity-70 mb-0.5">{lang}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-100 font-bold">{score} pts</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                            <span className="text-blue-400 text-[9px]">{Math.round(entry.language_times?.[lang] || 0)}s</span>
                                                        </div>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-10">
                                <div className="text-4xl mb-4 opacity-20">📊</div>
                                <p className="italic font-medium">No results recorded for this contest yet.</p>
                                <p className="text-xs mt-2 text-slate-600">Be the first one to score!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

interface ContestCardProps {
    contest: Contest;
    isActive: boolean;
    onSelect: () => void;
    onPlay: () => void;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest, isActive, onSelect, onPlay }) => {
    return (
        <div
            onClick={onSelect}
            className={`group relative p-5 rounded-2xl transition-all cursor-pointer border ${isActive
                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                : 'bg-slate-800/20 border-slate-800/50 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
        >
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {contest.name.en || contest.name.English}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${contest.status === 'Published' || contest.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                    {contest.status}
                </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {contest.supported_languages.map(lang => (
                    <span key={lang} className="bg-slate-800/80 text-slate-400 px-2 py-1 rounded text-[10px] font-bold border border-slate-700/50">
                        {lang}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800/50">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {contest.status === 'Active' || contest.status === 'Published'
                        ? `Ends ${new Date(contest.contest_end_at).toLocaleDateString()}`
                        : `Ended ${new Date(contest.contest_end_at).toLocaleDateString()}`
                    }
                </div>
                {(contest.status === 'Active' || contest.status === 'Published') && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlay();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        ENTER CONTEST
                    </button>
                )}
            </div>
        </div>
    );
};

export default ContestDashboard;
