import React, { useState, useRef, useEffect } from 'react';
import { Organisation } from '../services/routingService';
import { UserIcon, ChartBarIcon, CogIcon, LogoutIcon, CrossIcon } from './Icons'; // Assuming these exist, will check next

interface GameHeaderProps {
    orgData?: Organisation | null;
    gameLevel: number;
    gameState?: 'idle' | 'loading' | 'playing' | 'complete';
    username?: string | null;
    onLogout?: () => void;
    contestDetails?: any;
    currentLanguage?: string;
    languages?: any[];
    contestNameOverride?: string;
    onShowLogin?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ orgData, gameLevel, gameState, username, onLogout, contestDetails, currentLanguage, languages = [], contestNameOverride, onShowLogin }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getInitials = (name: string) => {
        return name.slice(0, 2).toUpperCase();
    };

    const getContestName = () => {
        console.log('[GameHeader] getContestName start:', { contestNameOverride, contestDetailsName: contestDetails?.name });
        if (contestNameOverride) return contestNameOverride;
        if (!contestDetails?.name) return 'Contest';

        if (typeof contestDetails.name === 'string') return contestDetails.name;

        // 1. Try direct match with currentLanguage (e.g. "English")
        if (currentLanguage && contestDetails.name[currentLanguage]) {
            return contestDetails.name[currentLanguage];
        }

        // 2. Case-insensitive search of keys for currentLanguage
        if (currentLanguage) {
            const lowerLang = currentLanguage.toLowerCase();
            const foundKey = Object.keys(contestDetails.name).find(k => k.toLowerCase() === lowerLang);
            if (foundKey) return contestDetails.name[foundKey];
        }

        // 3. Try lookup via langCode (e.g. "en")
        const langObj = languages.find(l =>
            l.name?.trim().toLowerCase() === currentLanguage?.trim().toLowerCase() ||
            l.code?.trim().toLowerCase() === currentLanguage?.trim().toLowerCase()
        );
        const langCode = langObj?.code?.toLowerCase();
        if (langCode && contestDetails.name[langCode]) {
            return contestDetails.name[langCode];
        }

        // 4. Fallback to English common keys
        return contestDetails.name['English'] || contestDetails.name['en'] || 'Contest';
    };

    return (
        <div className="w-full bg-slate-800/70 border-b border-slate-700 px-8 py-3 flex items-center justify-between gap-4 z-20 relative">
            <div className="flex items-center gap-4 w-1/3">
                {orgData?.org_name ? (
                    // Organization Header
                    <>
                        {orgData.logo_url ? (
                            <img
                                src={orgData.logo_url}
                                alt={`${orgData.org_name} logo`}
                                className="h-12 w-12 object-contain rounded-md"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-md bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">{orgData.org_name.charAt(0)}</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-slate-200 leading-tight">
                                {orgData.org_name} {contestDetails ? "- Active Contest" : "- Learner's Mode"}
                            </h1>
                        </div>
                    </>
                ) : (
                    // Default Header
                    <>
                        <img
                            src="/alphatub-logo.png"
                            alt="alphaTUB logo"
                            className="h-12 w-12 object-contain rounded-md"
                        />
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500 leading-tight">
                            alphaTUB {contestDetails ? "- Active Contest" : "- Learner's Mode"}
                        </h1>
                    </>
                )}
            </div>

            {/* Center: Contest Info */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-1/3 text-center">
                {contestDetails ? (
                    <>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-yellow-400 whitespace-nowrap">
                                {getContestName()}
                            </h1>
                            {currentLanguage && (
                                <span className="px-3 py-0.5 bg-teal-900/50 border border-teal-500/30 text-teal-300 text-xs font-semibold rounded-full uppercase tracking-wide">
                                    {currentLanguage}
                                </span>
                            )}
                        </div>
                        {contestDetails.description?.en && (
                            <p className="text-slate-400 text-xs max-w-md truncate">
                                {contestDetails.description.en}
                            </p>
                        )}
                    </>
                ) : (
                    // Show welcome text if not in contest mode and no specific org name (or just leave blank to reduce noise)
                    // Replicating original "Welcome" text here if desired, but user asked to keep Org Logo/Name "as it was".
                    // The original code had Org Name OR "Welcome...".
                    // I put Org Name on Left. "Welcome" text might be too long for left.
                    // I condensed default left to "alphaTUB Matches".
                    null
                )}
            </div>

            <div className="flex items-center gap-4 w-1/3 justify-end">
                {gameState && gameState !== 'idle' && (
                    <div className="px-4 py-1 bg-slate-700 rounded-full border border-slate-600">
                        <span className="text-slate-300 font-semibold">Level {gameLevel}</span>
                    </div>
                )}

                {/* User Profile Dropdown */}
                {username && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 hover:bg-slate-700/50 p-1 rounded-full transition-colors focus:outline-none"
                        >
                            <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden border-2 border-slate-500">
                                {/* Placeholder user image or initials */}
                                <span className="text-white font-bold text-sm">{getInitials(username)}</span>
                            </div>
                            <svg
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-xl border border-slate-700 py-1 z-50 animate-fadeIn">
                                <div className="px-4 py-2 border-b border-slate-700">
                                    <p className="text-sm font-medium text-white truncate">{username}</p>
                                </div>
                                <button
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    Profile
                                </button>
                                <button
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <ChartBarIcon className="w-4 h-4" />
                                    Play Statistics
                                </button>
                                <button
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <CogIcon className="w-4 h-4" />
                                    Settings
                                </button>
                                <div className="border-t border-slate-700 my-1"></div>
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onLogout && onLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2"
                                >
                                    <LogoutIcon className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!username && (
                    <button
                        onClick={onShowLogin}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <UserIcon className="w-4 h-4" />
                        <span>Login / Register</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default GameHeader;
