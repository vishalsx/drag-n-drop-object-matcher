import React, { useState, useEffect } from 'react';
import type { GameObject } from '../types/types';
import Tooltip from '../components/Tooltip';
import { ThumbsUpIcon, ThumbsDownIcon, SaveIcon, SpinnerIcon, CheckIcon, GridIcon, ListIcon, SpeakerIcon } from '../components/Icons';
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
    onVote: (translationId: string, voteType: 'up' | 'down') => void;
    onSaveSheet: () => void;
    onMatchedImageClick: (imageName: string) => void;
    currentLanguageBcp47: string;
}

const CompletionScreen: React.FC<CompletionScreenProps> = (props) => {
    const [completionView, setCompletionView] = useState<'list' | 'grid'>('grid');
    const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; top: number; left: number }>({ visible: false, content: '', top: 0, left: 0 });
    const [hoveredGridInfo, setHoveredGridInfo] = useState<{ item: GameObject; index: number } | null>(null);
    const { speakText, stop: stopSpeech } = useSpeech();

    useEffect(() => {
        // Cleanup function to stop any playing audio when the component unmounts (modal is closed)
        return () => {
            stopSpeech();
        };
    }, [stopSpeech]);

    const handleShowTooltip = (e: React.MouseEvent<HTMLElement>, description: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ visible: true, content: description, top: rect.top, left: rect.left + rect.width / 2 });
    };

    const handleHideTooltip = () => setTooltip(prev => ({ ...prev, visible: false }));

    const handleGridMouseEnter = (item: GameObject, index: number) => {
        if (hoveredGridInfo?.item.id !== item.id) {
            stopSpeech();
        }
        setHoveredGridInfo({ item, index });
    };
    
    const handleGridMouseLeave = () => {
        setHoveredGridInfo(null);
        stopSpeech();
    };

    return (
        <>
            {tooltip.visible && <Tooltip content={tooltip.content} top={tooltip.top} left={tooltip.left} />}
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4" role="dialog" aria-modal="true" aria-labelledby="completion-title">
                <div className="text-center w-full max-w-6xl max-h-[90vh] flex flex-col p-6 sm:p-8 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
                    <h2 id="completion-title" className="text-4xl font-bold text-green-400">Congratulations!</h2>
                    <p className="mt-2 text-lg text-slate-300">You've matched all the items! Final Score: <span className="font-bold text-yellow-300">{props.score}</span></p>
                    <p className="mt-2 text-md text-slate-400">Review your matches, vote, and save.</p>
                    
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
                                        <div className="flex items-center space-x-2 bg-slate-700/50 px-2 py-1 rounded-full text-white text-xs font-bold">
                                            <button onClick={() => props.onVote(item.id, 'up')} disabled={props.votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-green-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote up"><ThumbsUpIcon className="w-4 h-4" /></button>
                                            <span className="min-w-[1.5ch] text-center">{item.upvotes}</span>
                                            <button onClick={() => props.onVote(item.id, 'down')} disabled={props.votingInProgress.has(item.id)} className="p-1 rounded-full hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote down"><ThumbsDownIcon className="w-4 h-4" /></button>
                                            <span className="min-w-[1.5ch] text-center">{item.downvotes}</span>
                                        </div>
                                        {props.voteErrors[item.id] && (<p className="text-xs text-red-400" role="alert">{props.voteErrors[item.id]}</p>)}
                                    </div>
                                    </div>
                                ))}
                                </div>
                            )}
                            {completionView === 'grid' && (() => {
                                const getJustifyClass = (index: number | undefined) => {
                                if (index === undefined || index === null) return 'justify-center';
                                if (index <= 2) return 'justify-start'; // Top row
                                if (index <= 5) return 'justify-center'; // Middle row
                                return 'justify-end'; // Bottom row
                                };

                                return (
                                <div className="flex flex-col md:flex-row gap-4" onMouseLeave={handleGridMouseLeave}>
                                    <div className="w-full md:w-1/2 grid grid-cols-3 gap-2">
                                    {props.shuffledImages.map((item, index) => {
                                        const updatedItem = props.gameData.find(g => g.id === item.id) || item;
                                        return (
                                        <div 
                                            key={item.id} 
                                            className="flex flex-col items-center text-center p-1 bg-slate-900/50 rounded-lg border border-slate-700/50 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-blue-500"
                                            onMouseEnter={() => handleGridMouseEnter(updatedItem, index)} 
                                        >
                                            <div 
                                                className="relative w-full h-[5.5rem]" 
                                                onClick={() => props.onMatchedImageClick(updatedItem.imageName)}
                                            >
                                                <img src={updatedItem.imageUrl} alt={updatedItem.imageName} className="w-full h-full rounded-md object-cover" />
                                                <p className="absolute bottom-0 left-0 right-0 p-1 bg-black/30 text-white text-xs truncate font-semibold">{updatedItem.imageName}</p>
                                            </div>
                                            <div className="flex items-center w-full space-x-2 bg-slate-700/50 px-2 py-1 rounded-full text-white text-xs font-bold mt-2">
                                                <button onClick={() => props.onVote(updatedItem.id, 'up')} disabled={props.votingInProgress.has(updatedItem.id)} className="p-1 rounded-full hover:bg-green-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote up"><ThumbsUpIcon className="w-4 h-4" /></button>
                                                <span className="min-w-[1.5ch] text-center">{updatedItem.upvotes}</span>
                                                <button onClick={() => props.onVote(updatedItem.id, 'down')} disabled={props.votingInProgress.has(updatedItem.id)} className="p-1 rounded-full hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label="Vote down"><ThumbsDownIcon className="w-4 h-4" /></button>
                                                <span className="min-w-[1.5ch] text-center">{updatedItem.downvotes}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        speakText(updatedItem.object_description, props.currentLanguageBcp47);
                                                    }}
                                                    className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-600 transition-colors ml-auto"
                                                    aria-label="Read description aloud"
                                                >
                                                    <SpeakerIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {props.voteErrors[item.id] && (<p className="text-xs text-red-400 mt-1" role="alert">{props.voteErrors[item.id]}</p>)}
                                        </div>
                                    )})}
                                    </div>
                                    <div className={`w-full md:w-1/2 bg-slate-900/50 rounded-lg border border-slate-700/50 p-6 flex flex-col items-center transition-all duration-300 min-h-[150px] ${getJustifyClass(hoveredGridInfo?.index)}`}>
                                    {hoveredGridInfo ? (
                                        <div className="text-center animate-fadeIn">
                                            <h3 className="font-bold text-xl text-teal-300 mb-2">{hoveredGridInfo.item.imageName}</h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">{hoveredGridInfo.item.object_description}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-500">
                                        <p>Hover over an object to see its description.</p>
                                        </div>
                                    )}
                                    </div>
                                </div>
                                );
                            })()}
                         </div>
                    </div>

                    <div className="flex-shrink-0 mt-4">
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            <button 
                            onClick={props.onSaveSheet} 
                            disabled={props.sheetSaveState === 'saving' || props.sheetSaveState === 'success'}
                            className={`px-6 py-2 flex items-center justify-center gap-2 font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 ${
                                props.sheetSaveState === 'idle' ? 'bg-green-600 hover:bg-green-500 text-white' : ''
                            } ${
                                props.sheetSaveState === 'saving' ? 'bg-yellow-500 text-black cursor-wait' : ''
                            } ${
                                props.sheetSaveState === 'success' ? 'bg-teal-500 text-white cursor-not-allowed' : ''
                            } ${
                                props.sheetSaveState === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' : ''
                            }`}
                            >
                            {props.sheetSaveState === 'saving' && <><SpinnerIcon className="w-5 h-5" /> Saving...</>}
                            {props.sheetSaveState === 'success' && <><CheckIcon className="w-5 h-5" /> Saved!</>}
                            {props.sheetSaveState === 'error' && 'Save Failed'}
                            {props.sheetSaveState === 'idle' && <><SaveIcon className="w-5 h-5" /> Save tubCard</>}
                            </button>
                            <button onClick={props.onClose} className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105">
                            Close
                            </button>
                        </div>
                        {props.sheetSaveError && <p className="text-red-400 text-sm mt-3" role="alert">{props.sheetSaveError}</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompletionScreen;
