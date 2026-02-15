import React, { useState, useEffect, useCallback } from 'react';
import type { GameObject, Language } from '../types/types';
import { useTooltip } from '../context/TooltipContext';
import { ThumbsUpIcon, ThumbsDownIcon, SaveIcon, SpinnerIcon, CheckIcon, GridIcon, ListIcon, SpeakerIcon, RefreshIcon, ThumbsUpSolidIcon, ThumbsDownSolidIcon } from '../components/Icons';
import { useSpeech } from '../hooks/useSpeech';

interface CompletionScreenProps {
    score: number;
    gameData: GameObject[];
    shuffledImages: GameObject[];
    voteErrors: Record<string, string | null>;
    votingInProgress: Set<string>;
    sheetSaveState: 'idle' | 'saving' | 'success' | 'error';
    sheetSaveError: string | null;
    onClose: () => void;
    onPlayAgain: () => void;
    onVote: (translationId: string, voteType: 'up' | 'down') => void;
    onSaveSheet: () => void;
    onMatchedImageClick: (imageName: string) => void;
    currentLanguageBcp47: string;
    onLevel2?: () => void;
    isFromTubSheet?: boolean;
    isFromPlaylist?: boolean;
    isLoggedIn: boolean;
    isPublicOrg?: boolean;
    availableLanguages: Language[];
    onReplayInLanguage: (language: string) => void;
    currentLanguageName: string;
}

const CompletionScreen: React.FC<CompletionScreenProps> = (props) => {
    const [completionView, setCompletionView] = useState<'list' | 'grid'>('grid');
    const [selectedGridInfo, setSelectedGridInfo] = useState<{ item: GameObject; index: number } | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);
    const [manualLanguage, setManualLanguage] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const { speakText, stop: stopSpeech } = useSpeech();
    const { showTooltip, hideTooltip } = useTooltip();

    const getRandomLanguages = useCallback(() => {
        if (!props.availableLanguages) return [];
        const otherLangs = props.availableLanguages.filter(lang => lang.name !== props.currentLanguageName);
        const shuffled = [...otherLangs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, 5);
    }, [props.availableLanguages, props.currentLanguageName]);

    const [displayLangs, setDisplayLangs] = useState<Language[]>([]);

    useEffect(() => {
        setDisplayLangs(getRandomLanguages());
    }, [getRandomLanguages]);

    const handleRefreshLanguages = () => {
        setDisplayLangs(getRandomLanguages());
        setRefreshCount(prev => prev + 1);
    };

    const handleManualPlay = () => {
        setValidationError(null);
        const trimmed = manualLanguage.trim();
        if (!trimmed) {
            setValidationError("Please enter a language name.");
            return;
        }

        // Normalize to Title Case (e.g., "hindi" -> "Hindi", "field of study" -> "Field Of Study")
        const normalized = trimmed
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        const exists = props.availableLanguages.some(lang => lang.name.toLowerCase() === trimmed.toLowerCase());

        if (exists) {
            const matchedLang = props.availableLanguages.find(lang => lang.name.toLowerCase() === trimmed.toLowerCase());
            if (matchedLang) {
                props.onReplayInLanguage(matchedLang.name);
            }
        } else {
            setValidationError(`"${normalized}" is not available. Please try another language.`);
        }
    };

    useEffect(() => {
        // Cleanup function to stop any playing audio when the component unmounts (modal is closed)
        return () => {
            stopSpeech();
        };
    }, [stopSpeech]);

    const handleShowTooltip = (e: React.MouseEvent<HTMLElement>, description: string) => {
        showTooltip(description, e.currentTarget.getBoundingClientRect());
    };

    const handleHideTooltip = () => hideTooltip();



    return (
        <>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="completion-title">
                <div className="text-center w-full max-w-6xl max-h-[98vh] flex flex-col p-4 sm:p-6 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
                    <div className="mt-2 w-full">
                        <h2 id="completion-title" className="text-3xl sm:text-4xl font-bold text-green-400">Congratulations!</h2>
                        <p className="mt-1 text-md sm:text-lg text-slate-300">You've matched all the items! Final Score: <span className="font-bold text-yellow-300">{props.score}</span></p>
                        <p className="text-sm text-slate-400">Review your matches, vote, and save.</p>
                    </div>

                    <div className="flex flex-col flex-grow my-2 overflow-hidden">
                        <div className="flex justify-end gap-2 mb-4 flex-shrink-0">
                            <button onClick={() => setCompletionView('grid')} className={`p-2 rounded-md transition-colors ${completionView === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} aria-label="Grid view">
                                <GridIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setCompletionView('list')} className={`p-2 rounded-md transition-colors ${completionView === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} aria-label="List view">
                                <ListIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto pr-2">
                            {completionView === 'list' && (
                                <div className="space-y-3">
                                    {props.gameData.map(item => (
                                        <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                            <div className="flex items-center text-left cursor-pointer flex-1 min-w-0 w-full mb-3 sm:mb-0 sm:mr-4" onClick={() => props.onMatchedImageClick(item.imageName)}>
                                                <img src={item.imageUrl} alt={item.imageName} className="w-16 h-16 rounded-md object-cover mr-4 flex-shrink-0" />
                                                <div
                                                    className="min-w-0 flex-1"
                                                    onMouseEnter={(e) => handleShowTooltip(e, item.object_description)}
                                                    onMouseLeave={handleHideTooltip}
                                                >
                                                    <p className="font-bold text-slate-200 truncate">{item.imageName}</p>
                                                    <p className="text-sm text-slate-400 mt-1 italic max-h-12 overflow-y-auto pr-1">"{item.object_description}"</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center space-y-1 relative sm:ml-4 flex-shrink-0">
                                                <div className="flex items-center space-x-2 bg-slate-800/80 pl-5 pr-3 py-1.5 rounded-md text-white text-xs font-bold border border-slate-700/50">
                                                    <div className="flex items-center">
                                                        <button onClick={() => props.onVote(item.id, 'up')} disabled={props.votingInProgress.has(item.id)} className="p-1 rounded-md text-white hover:bg-slate-700 transition-colors disabled:opacity-50" aria-label="Vote up">
                                                            {item.userVote === 'up' ? <ThumbsUpSolidIcon className="w-4 h-4" /> : <ThumbsUpIcon className="w-4 h-4" />}
                                                        </button>
                                                        <span className="min-w-[1.2ch] text-center ml-0.5">{item.upvotes}</span>
                                                    </div>
                                                    <div className="w-[1px] h-3.5 bg-slate-700/50 mx-1"></div>
                                                    <div className="flex items-center">
                                                        <button onClick={() => props.onVote(item.id, 'down')} disabled={props.votingInProgress.has(item.id)} className="p-1 rounded-md text-white hover:bg-slate-700 transition-colors disabled:opacity-50" aria-label="Vote down">
                                                            {item.userVote === 'down' ? <ThumbsDownSolidIcon className="w-4 h-4" /> : <ThumbsDownIcon className="w-4 h-4" />}
                                                        </button>
                                                        <span className="min-w-[1.2ch] text-center ml-0.5">{item.downvotes}</span>
                                                    </div>
                                                </div>
                                                {props.voteErrors[item.id] && (<p className="text-xs text-red-400" role="alert">{props.voteErrors[item.id]}</p>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {completionView === 'grid' && (() => {
                                return (
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="w-full md:w-1/2 grid grid-cols-3 gap-2">
                                            {props.shuffledImages.map((item, index) => {
                                                const updatedItem = props.gameData.find(g => g.id === item.id) || item;
                                                const isSelected = selectedGridInfo?.item.id === updatedItem.id;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`flex flex-col items-center text-center p-1 bg-slate-900/50 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-105 ${isSelected ? 'border-teal-400 ring-2 ring-teal-400/30' : 'border-slate-700/50 hover:border-blue-500'}`}
                                                        onClick={() => {
                                                            props.onMatchedImageClick(updatedItem.imageName);
                                                            setSelectedGridInfo({ item: updatedItem, index });
                                                        }}
                                                    >
                                                        <div className="relative w-full h-[10rem]">
                                                            <img src={updatedItem.imageUrl} alt={updatedItem.imageName} className="w-full h-full rounded-md object-contain" />

                                                            {/* Interaction Overlay (Top) */}
                                                            <div className="absolute top-0 left-0 right-0 flex items-center justify-between bg-black/40 backdrop-blur-sm px-2 py-1 rounded-t-md text-white text-xs font-bold border-b border-white/10" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="flex items-center">
                                                                        <button onClick={() => props.onVote(updatedItem.id, 'up')} disabled={props.votingInProgress.has(updatedItem.id)} className="p-0.5 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50" aria-label="Vote up">
                                                                            {updatedItem.userVote === 'up' ? <ThumbsUpSolidIcon className="w-3.5 h-3.5" /> : <ThumbsUpIcon className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                        <span className="min-w-[1ch] text-center ml-0.5 text-[10px]">{updatedItem.upvotes}</span>
                                                                    </div>
                                                                    <div className="flex items-center">
                                                                        <button onClick={() => props.onVote(updatedItem.id, 'down')} disabled={props.votingInProgress.has(updatedItem.id)} className="p-0.5 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50" aria-label="Vote down">
                                                                            {updatedItem.userVote === 'down' ? <ThumbsDownSolidIcon className="w-3.5 h-3.5" /> : <ThumbsDownIcon className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                        <span className="min-w-[1ch] text-center ml-0.5 text-[10px]">{updatedItem.downvotes}</span>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => speakText(updatedItem.object_description, props.currentLanguageBcp47)}
                                                                    className="p-0.5 rounded-md hover:bg-white/20 transition-colors"
                                                                    aria-label="Read description aloud"
                                                                >
                                                                    <SpeakerIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {/* Name Overlay (Bottom) */}
                                                            <p className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm text-white text-xs truncate font-semibold border-t border-white/10 rounded-b-md">{updatedItem.imageName}</p>
                                                        </div>
                                                        {props.voteErrors[item.id] && (<p className="text-xs text-red-400 mt-1" role="alert">{props.voteErrors[item.id]}</p>)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="w-full md:w-1/2 bg-slate-900/50 rounded-lg border border-slate-700/50 p-6 flex flex-col items-center justify-start transition-all duration-300 min-h-[150px] max-h-[60vh] overflow-y-auto">
                                            {selectedGridInfo ? (
                                                <div className="text-center animate-fadeIn w-full">
                                                    <h3 className="font-bold text-xl text-teal-300 mb-2 sticky top-0 bg-slate-900/90 py-1 backdrop-blur-sm z-10">{selectedGridInfo.item.imageName}</h3>
                                                    <p className="text-slate-300 text-sm leading-relaxed break-words text-justify px-2">{selectedGridInfo.item.object_description}</p>
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-500 my-auto">
                                                    <p>Click on an object to see its description.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex-shrink-0 mt-2">
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            {!props.isFromTubSheet && !props.isFromPlaylist && !props.isPublicOrg && (
                                <button
                                    onClick={props.onSaveSheet}
                                    disabled={!props.isLoggedIn || props.sheetSaveState === 'saving' || props.sheetSaveState === 'success'}
                                    title={!props.isLoggedIn ? "Login required to save" : "Save this game as a TubCard"}
                                    className={`px-6 py-2 flex items-center justify-center gap-2 font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 
                                        ${!props.isLoggedIn ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-70 hover:scale-100' : ''}
                                        ${props.isLoggedIn && props.sheetSaveState === 'idle' ? 'bg-green-600 hover:bg-green-500 text-white' : ''}
                                        ${props.sheetSaveState === 'saving' ? 'bg-yellow-500 text-black cursor-wait hover:scale-100' : ''}
                                        ${props.sheetSaveState === 'success' ? 'bg-teal-500 text-white cursor-not-allowed hover:scale-100' : ''}
                                        ${props.sheetSaveState === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' : ''}
                                    `}
                                >
                                    {props.sheetSaveState === 'saving' && <><SpinnerIcon className="w-5 h-5" /> Saving...</>}
                                    {props.sheetSaveState === 'success' && <><CheckIcon className="w-5 h-5" /> Saved!</>}
                                    {props.sheetSaveState === 'error' && 'Save Failed'}
                                    {props.sheetSaveState === 'idle' && <><SaveIcon className="w-5 h-5" />Save This Card</>}
                                </button>
                            )}
                            {props.onLevel2 && (
                                <button
                                    onClick={props.onLevel2}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
                                >
                                    Level 2 🚀
                                </button>
                            )}
                            <button onClick={props.onPlayAgain} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2">
                                <RefreshIcon className="w-5 h-5" /> Play Again
                            </button>
                            <button onClick={props.onClose} className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                                Close
                            </button>
                        </div>

                        {/* Play in another language section */}
                        {props.availableLanguages && props.availableLanguages.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-teal-400">Play in another language?</h3>
                                    {props.availableLanguages.length > 6 && (
                                        <button
                                            onClick={handleRefreshLanguages}
                                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-full transition-colors shadow-sm"
                                            title="Refresh language suggestions"
                                            aria-label="Refresh languages"
                                        >
                                            <RefreshIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {displayLangs.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => props.onReplayInLanguage(lang.name)}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-blue-600 text-white rounded-full transition-all hover:scale-105 shadow-md group"
                                        >
                                            <img src={lang.imageUrl} alt={lang.name} className="w-6 h-4 object-cover rounded shadow-sm" />
                                            <span className="font-semibold">{lang.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {refreshCount >= 5 && (
                                    <div className="mt-6 p-4 bg-slate-900/60 rounded-xl border border-teal-500/30 animate-fadeIn">
                                        <p className="text-slate-300 mb-3 italic">"Looks like you can't find the right language, why don't you try and type it?"</p>
                                        <div className="flex flex-col sm:flex-row items-start justify-center gap-3">
                                            <div className="w-full sm:w-64">
                                                <input
                                                    type="text"
                                                    value={manualLanguage}
                                                    onChange={(e) => {
                                                        setManualLanguage(e.target.value);
                                                        setValidationError(null);
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleManualPlay()}
                                                    placeholder="Type language name..."
                                                    className={`w-full px-4 py-2 bg-slate-800 border ${validationError ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all`}
                                                />
                                                {validationError && (
                                                    <p className="mt-1.5 text-[11px] text-red-400 font-medium text-left px-1">{validationError}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleManualPlay}
                                                className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                                            >
                                                Play
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {props.sheetSaveError && <p className="text-red-400 text-sm mt-3" role="alert">{props.sheetSaveError}</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompletionScreen;