import React from 'react';
import { CrossIcon } from './Icons';
import MasteryGauge from './AnalyticsWidgets/MasteryGauge';
import { Language } from '../types/types';
import { analyticsService } from '../services/analyticsService';
import { authService } from '../services/authService';

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string | null;
    languages: Language[];
    selectedLanguage: string;
    orgId?: string | null;
    orgCode?: string | null;
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, username, languages, selectedLanguage, orgId, orgCode }) => {
    const [isLangDropdownOpen, setIsLangDropdownOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [localSelectedLanguage, setLocalSelectedLanguage] = React.useState(selectedLanguage);
    const [masteryStats, setMasteryStats] = React.useState({
        score: 0,
        coverage: 0,
        wordsExposed: 0,
        totalWords: 0,
        change: 0,
        period: 'this week'
    });
    const langDropdownRef = React.useRef<HTMLDivElement>(null);

    // Sync local language with prop only when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalSelectedLanguage(selectedLanguage);
        }
    }, [isOpen, selectedLanguage]);

    React.useEffect(() => {
        const fetchMastery = async () => {
            const token = authService.getToken();
            if (isOpen && token && localSelectedLanguage) {
                setIsLoading(true);
                try {
                    const data = await analyticsService.getMasteryScore(localSelectedLanguage, token, orgId, orgCode);
                    setMasteryStats(data);
                } catch (error) {
                    console.error('Failed to fetch mastery score:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchMastery();
    }, [isOpen, localSelectedLanguage, orgId, orgCode]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setIsLangDropdownOpen(false);
            }
        };
        if (isLangDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLangDropdownOpen]);

    if (!isOpen) return null;

    const currentLanguageName = languages.find(l => l.code === localSelectedLanguage)?.name || 'English';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </span>
                            Learning Analytics
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Performance insights for <span className="text-blue-400 font-semibold">{username}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Language Selector */}
                        <div className="relative" ref={langDropdownRef}>
                            <button
                                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-750 transition-colors group"
                            >
                                <span className="text-xs text-slate-500 font-medium">Language:</span>
                                <span className="text-sm font-bold text-teal-400">{currentLanguageName}</span>
                                <svg className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isLangDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-64 overflow-y-auto animate-fadeIn custom-scrollbar">
                                    {languages.map((lang) => {
                                        const isSelected = localSelectedLanguage === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    setLocalSelectedLanguage(lang.code);
                                                    setIsLangDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium mb-1 ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-700 text-slate-300'}`}
                                            >
                                                <span>{lang.name}</span>
                                                {isSelected && <span className="text-blue-400">✓</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <CrossIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Dashboard Area */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Primary Widget: Overall Mastery */}
                        <div className={`relative min-h-[280px] transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                            {isLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <MasteryGauge
                                label={`${currentLanguageName} Mastery`}
                                score={masteryStats.score}
                                coverage={masteryStats.coverage}
                                change={masteryStats.change}
                                period={masteryStats.period}
                                wordsExposed={masteryStats.wordsExposed}
                                totalWords={masteryStats.totalWords}
                            />
                        </div>

                        {/* Placeholder for future widgets */}
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-slate-800/30 border border-slate-800 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px] group hover:bg-slate-800/40 transition-all">
                                <div className="w-12 h-12 rounded-full bg-slate-700/30 flex items-center justify-center mb-4 text-slate-600 group-hover:text-slate-400 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 text-sm font-medium">Coming Soon</p>
                                <p className="text-slate-600 text-xs mt-2 text-center px-4 italic">Next precision learning widget will appear here</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <p>© 2026 playTUB Analytics Engine v1.0</p>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Live Updates
                        </span>
                        <span className="cursor-pointer hover:text-blue-400 transition-colors">Help Center</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsModal;
