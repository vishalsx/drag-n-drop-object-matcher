import React, { useState, useRef, useEffect } from 'react';
import { Organisation } from '../services/routingService';
import { UserIcon, ChartBarIcon, CogIcon, LogoutIcon } from './Icons'; // Assuming these exist, will check next

interface GameHeaderProps {
    orgData?: Organisation | null;
    gameLevel: number;
    gameState?: 'idle' | 'loading' | 'playing' | 'complete';
    username?: string | null;
    onLogout?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ orgData, gameLevel, gameState, username, onLogout }) => {
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

    return (
        <div className="w-full bg-slate-800/70 border-b border-slate-700 px-8 py-4 flex items-center justify-between gap-4 z-20 relative">
            <div className="flex items-center gap-4">
                {orgData?.org_name ? (
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
                        <h1 className="text-2xl font-bold text-slate-200">
                            {orgData.org_name}
                        </h1>
                    </>
                ) : (
                    <>
                        <img
                            src="/alphatub-logo.png"
                            alt="alphaTUB logo"
                            className="h-12 w-12 object-contain rounded-md"
                        />
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500">
                            Welcome to the multilingual language learning platform!
                        </h1>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">
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
            </div>
        </div>
    );
};

export default GameHeader;
