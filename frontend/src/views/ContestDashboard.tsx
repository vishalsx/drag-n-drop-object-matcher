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

    const formatTime = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    };

    const handlePlayContest = (contest: Contest) => {
        const contestId = contest.id || contest._id;
        window.location.href = `/${orgData.org_code}/contest/${contestId}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0c] text-slate-100 font-sans relative overflow-hidden">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Top Bar: Nav/Branding */}
            <div className="z-10 flex-shrink-0 bg-white/[0.02] backdrop-blur-md border-b border-white/10 p-5 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img
                                src="/alphatub-logo.png"
                                alt="playTUB"
                                className="h-10 w-10 object-contain drop-shadow-xl"
                            />
                            <span className="text-2xl font-black tracking-tighter text-white">playTUB</span>
                        </a>
                    </div>
                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                    <div className="flex items-center gap-3">
                        {orgData.logo_url ? (
                            <img src={orgData.logo_url} alt={orgData.org_name} className="h-10 object-contain drop-shadow-xl" />
                        ) : (
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
                                {orgData.org_name ? orgData.org_name[0] : 'O'}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Organization</span>
                            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">{orgData.org_name}</h1>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Current Portal</span>
                        <span className="text-sm font-bold text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 shadow-lg shadow-blue-500/5">
                            Contest Management
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="z-10 flex flex-col lg:flex-row flex-1 p-6 md:p-10 gap-8 min-h-0 overflow-visible lg:overflow-hidden">

                {/* Left Panel: Contests */}
                <div className="w-full lg:w-[45%] flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
                    <div className="p-8 pb-4 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-white mb-1">Available Events</h2>
                            <p className="text-slate-500 text-sm">Select a contest to view details and rankings.</p>
                        </div>
                        <div className="flex h-10 w-10 bg-white/5 rounded-full items-center justify-center text-blue-400 font-black border border-white/10">
                            {contests.length}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar scroll-smooth">
                        {isLoadingContests ? (
                            <div className="h-40 flex flex-col items-center justify-center gap-4 text-slate-600">
                                <SpinnerIcon className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Scanning Grid...</span>
                            </div>
                        ) : (activeContests.length > 0 || otherContests.length > 0) ? (
                            <div className="space-y-10">
                                {activeContests.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">Featured & Active</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {activeContests.map(c => (
                                                <ContestCard
                                                    key={c.id || c._id}
                                                    contest={c}
                                                    isActive={selectedContest?.id === c.id || selectedContest?._id === c._id}
                                                    onSelect={() => setSelectedContest(c)}
                                                    onPlay={() => handlePlayContest(c)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherContests.length > 0 && (
                                    <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">History & Past</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {otherContests.map(c => (
                                                <ContestCard
                                                    key={c.id || c._id}
                                                    contest={c}
                                                    isActive={selectedContest?.id === c.id || selectedContest?._id === c._id}
                                                    onSelect={() => setSelectedContest(c)}
                                                    onPlay={() => handlePlayContest(c)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-60 flex flex-col items-center justify-center text-center px-10">
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-3xl mb-6 opacity-30">📂</div>
                                <h4 className="text-slate-400 font-bold mb-2 text-lg">No Contests Found</h4>
                                <p className="text-slate-600 text-sm italic">It looks like there are no active sessions available for this organization right now.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Leaderboard */}
                <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-400/5 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                                🏆
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-emerald-400 leading-none mb-1.5 uppercase">Hall of Fame</h2>
                                {selectedContest && (
                                    <p className="text-slate-500 text-sm font-medium tracking-tight bg-white/5 px-3 py-0.5 rounded-full inline-block border border-white/5">
                                        {selectedContest.name.en || selectedContest.name.English}
                                    </p>
                                )}
                            </div>
                        </div>

                        {averageTime > 0 && (
                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10 shadow-xl">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Global Performance</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-white">{formatTime(averageTime)}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">Avg Time</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3 custom-scrollbar">
                        {!selectedContest ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-10 opacity-30">
                                <div className="text-6xl mb-6">🎯</div>
                                <p className="text-lg italic font-medium">Select a contest to unlock the rankings.</p>
                            </div>
                        ) : isLoadingLeaderboard ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
                                <SpinnerIcon className="w-12 h-12 animate-spin text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing Data...</span>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            <div className="space-y-4">
                                {leaderboard.map((entry) => (
                                    <LeaderboardRecord key={entry.rank} entry={entry} formatTime={formatTime} />
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center px-10 opacity-40">
                                <div className="text-6xl mb-6">⌛</div>
                                <h4 className="text-slate-300 font-bold mb-2">Grand Arena is empty</h4>
                                <p className="text-sm italic mb-1">Be the catalyst. Start your journey and claim the top of the board.</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase mt-4 border border-white/5 rounded-full px-4 py-1">Awaiting first participant</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}} />
        </div>
    );
};

const ContestCard: React.FC<{ contest: Contest; isActive: boolean; onSelect: () => void; onPlay: () => void }> = ({ contest, isActive, onSelect, onPlay }) => {
    return (
        <div
            onClick={onSelect}
            className={`group relative p-6 rounded-3xl transition-all cursor-pointer border overflow-hidden ${isActive
                ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/5'
                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                }`}
        >
            {isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight max-w-[70%]">
                    {contest.name.en || contest.name.English}
                </h3>
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${contest.status === 'Published' || contest.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/5 text-slate-500 border-white/10'
                    }`}>
                    {contest.status}
                </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 relative z-10 transition-transform group-hover:translate-x-1">
                {contest.supported_languages.map(lang => (
                    <span key={lang} className="bg-white/5 text-slate-300 px-3 py-1 rounded-xl text-[10px] font-bold border border-white/10 group-hover:bg-white/10 transition-colors">
                        {lang}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-white/5 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Time Window</span>
                    <span className="text-xs text-white/60 font-medium">
                        {contest.status === 'Active' || contest.status === 'Published'
                            ? `Ends ${new Date(contest.contest_end_at).toLocaleDateString()}`
                            : `Ended ${new Date(contest.contest_end_at).toLocaleDateString()}`
                        }
                    </span>
                </div>

                {(contest.status === 'Active' || contest.status === 'Published') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPlay(); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2.5 px-6 rounded-2xl transition-all shadow-xl shadow-blue-600/20 transform group-hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        START
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const LeaderboardRecord: React.FC<{ entry: LeaderboardEntry; formatTime: (s: number) => string }> = ({ entry, formatTime }) => {
    const isTop3 = entry.rank <= 3;

    return (
        <div className={`relative p-5 md:p-6 rounded-[2rem] transition-all flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden ${entry.is_current_user
            ? 'bg-blue-600/10 border border-blue-500/30'
            : 'bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] hover:border-white/10'
            }`}>
            {entry.is_current_user && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            )}

            <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 relative ${entry.rank === 1 ? 'bg-gradient-to-tr from-[#FFD700] to-[#FFA500] text-[#422500] shadow-[0_0_20px_rgba(255,215,0,0.4)]' :
                    entry.rank === 2 ? 'bg-gradient-to-tr from-[#E2E2E2] to-[#A2A2A2] text-[#333] shadow-[0_0_20px_rgba(226,226,226,0.3)]' :
                        entry.rank === 3 ? 'bg-gradient-to-tr from-[#CD7F32] to-[#8B4513] text-white shadow-[0_0_20px_rgba(205,127,50,0.3)]' :
                            'bg-white/5 text-slate-400 border border-white/10'
                    }`}>
                    {entry.rank}
                    {isTop3 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white/20 rounded-full blur-[2px]"></div>}
                </div>

                <div className="flex flex-col">
                    <span className={`text-xl font-black ${entry.is_current_user ? 'text-blue-300' : 'text-white'}`}>
                        {entry.username}
                        {entry.is_current_user && (
                            <span className="ml-3 text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black inline-block vertical-middle shadow-lg shadow-blue-500/20">ME</span>
                        )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Competitor Alpha</span>
                </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black tracking-tight ${isTop3 ? 'text-white' : 'text-slate-300'}`}>
                        {entry.total_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Credits</span>
                </div>

                <div className="flex gap-2 min-h-10 justify-start sm:justify-end overflow-x-auto pb-1 max-w-full sm:max-w-[280px]">
                    {Object.entries(entry.language_scores || {}).map(([lang, score]) => (
                        <div key={lang} className="flex-shrink-0 px-3 py-2 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-w-[70px]">
                            <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">{lang}</span>
                            <div className="flex items-center gap-1.5 leading-none">
                                <span className="text-[11px] font-black text-white">{score}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="text-[9px] font-bold text-blue-400">{formatTime(entry.language_times?.[lang] || 0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContestDashboard;
