import React, { useState, useEffect } from 'react';
import { Organisation } from '../services/routingService';
import { contestService } from '../services/contestService';
import { Contest, LeaderboardEntry } from '../types/contestTypes';
import { SpinnerIcon } from '../components/Icons';

interface ContestDashboardProps {
    orgData: Organisation;
}

const ContestDashboard: React.FC<ContestDashboardProps> = ({ orgData }) => {
    const [contests, setContests] = useState<Contest[]>([]);
    const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoadingContests, setIsLoadingContests] = useState(true);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    useEffect(() => {
        const fetchContests = async () => {
            if (orgData.org_id) {
                const data = await contestService.getContestsByOrg(orgData.org_id);
                setContests(data);
                if (data.length > 0) {
                    setSelectedContest(data[0]);
                }
                setIsLoadingContests(false);
            }
        };
        fetchContests();
    }, [orgData.org_id]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (selectedContest?.id || selectedContest?._id) {
                const contestId = (selectedContest.id || selectedContest._id) as string;
                setIsLoadingLeaderboard(true);
                try {
                    const data = await contestService.getContestLeaderboard(contestId, 20);
                    setLeaderboard(data);
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
                        ) : contests.length > 0 ? (
                            contests.map((contest) => (
                                <div
                                    key={contest.id || contest._id}
                                    onClick={() => setSelectedContest(contest)}
                                    className={`group relative p-5 rounded-2xl transition-all cursor-pointer border ${(selectedContest?.id === contest.id || selectedContest?._id === contest._id)
                                        ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                        : 'bg-slate-800/20 border-slate-800/50 hover:bg-slate-800/40 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {contest.name.en || contest.name.English}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${contest.status === 'Published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
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
                                            Ends {new Date(contest.contest_end_at).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayContest(contest);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                        >
                                            ENTER CONTEST
                                        </button>
                                    </div>
                                </div>
                            ))
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
                                        <div className="flex flex-col items-end">
                                            <span className={`text-3xl font-black ${entry.rank <= 3 ? 'text-white' : 'text-slate-300'
                                                }`}>
                                                {entry.total_score}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Points</span>
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

export default ContestDashboard;
