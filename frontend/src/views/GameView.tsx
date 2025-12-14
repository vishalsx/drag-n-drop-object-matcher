import React, { useState, useEffect } from 'react';
import DraggableDescription from '../components/DraggableDescription';
import DroppableImage from '../components/DroppableImage';
import SidePanel from '../components/SidePanel';
import LoadingScreen from './LoadingScreen';
import { MenuIcon } from '../components/Icons';
// Fix: Import CategoryFosItem to resolve type errors.
import type { GameObject, Difficulty, Language, CategoryFosItem, PlaylistItem, TubSheetItem } from '../types/types';
import PacManChaseAnimation from '../components/PacManChaseAnimation';
import SnakeGameAnimation from '../components/SnakeGameAnimation';
import { tubSheetService } from '../services/tubSheetService';

interface GameViewProps {
    score: number;
    shuffledDescriptions: GameObject[];
    shuffledImages: GameObject[];
    correctlyMatchedIds: Set<string>;
    wrongDropSourceId: string | null;
    wrongDropTargetId: string | null;
    justMatchedId: string | null;
    handleDrop: (imageId: string, descriptionId: string) => void;
    handleMatchedImageClick: (imageName: string) => void;
    gameState: 'idle' | 'loading' | 'playing' | 'complete';

    // SidePanel Props
    languages: Language[];
    selectedLanguage: string;
    onSelectLanguage: (lang: string) => void;
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    selectedFos: string;
    onSelectFos: (fos: string) => void;
    // Fix: Update prop types to match the data structure from the useGame hook.
    objectCategories: CategoryFosItem[];
    fieldsOfStudy: CategoryFosItem[];
    areCategoriesLoading: boolean;
    difficulty: Difficulty;
    onSelectDifficulty: (diff: Difficulty) => void;
    onStartGame: () => void;
    onWithdrawRequest: () => void;
    handleSpeakHint: (text: string) => void;
    languageBcp47: string;
    orgData?: { org_name?: string; logo_url?: string } | null;
    selectedTubSheet: string;
    onSelectTubSheet: (id: string) => void;
    searchKeyword: string;
    onSearchKeywordChange: (keyword: string) => void;
    onSelectBookId: (id: string | null) => void;
    onSelectChapterId: (id: string | null) => void;
    onSelectPageId: (id: string | null) => void;
    selectedPageId: string | null;
}

const GameView: React.FC<GameViewProps> = (props) => {
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [animationToShow, setAnimationToShow] = useState<'pacman' | 'snake'>('pacman');
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [expandedSection, setExpandedSection] = useState<'presets' | 'custom'>('presets');

    // Search fields state - Placeholder data for future API integration
    const [standardPlaylists] = useState<PlaylistItem[]>([
        { id: 'playlist-1', name: 'Beginner Vocabulary' },
        { id: 'playlist-2', name: 'Intermediate Phrases' },
        { id: 'playlist-3', name: 'Advanced Topics' },
    ]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');

    const [myTubSheets, setMyTubSheets] = useState<TubSheetItem[]>([]);


    // Page selection state for playlist

    // Page selection state for playlist
    // We now use parent props to manage selected page info
    // const [selectedPageInfo, setSelectedPageInfo] = useState<{ bookId: string, chapterId: string, pageId: string } | null>(null);

    // Local loading state for playlist page fetch - managed by gameState 'loading'
    // const [isLoadingPlaylistPage, setIsLoadingPlaylistPage] = useState(false);

    // Search handlers - Placeholder functions for future API integration
    const handleSelectPlaylist = (playlistId: string) => {
        setSelectedPlaylist(playlistId);
        console.log('Selected playlist:', playlistId);
        // TODO: Integrate with API to fetch playlist data
    };

    const handleSelectTubSheet = (tubSheetId: string) => {
        props.onSelectTubSheet(tubSheetId);
        console.log('Selected tubsheet:', tubSheetId);
    };


    const handleSearch = () => {
        console.log('Searching for keyword:', props.searchKeyword);
        // TODO: Integrate with API to search based on keyword
    };

    // Fetch TubSheets when language or other filters change
    useEffect(() => {
        const fetchTubSheets = async () => {
            // Only fetch if a language is selected
            if (props.languageBcp47 || props.selectedLanguage) {
                // Determine which language code to use (bcp47 preferred or selectedLanguage code)
                const code = props.selectedLanguage;
                const languageObj = props.languages.find(l => l.code === code);
                const langName = languageObj ? languageObj.name : (props.languageBcp47 || code);

                // Fetch sheets. Pass category/fos if needed, currently passing undefined for broad search 
                // or you can pass props.selectedCategory if you want to filter dropdown by current category too.
                // Request asked to filter by language, optionally object_category, field_of_study.
                // Let's pass them to respect the current view context.
                const sheets = await tubSheetService.getTubSheets(
                    langName,
                    props.selectedCategory,
                    props.selectedFos
                );
                setMyTubSheets(sheets);
            }
        };

        fetchTubSheets();
    }, [props.selectedLanguage, props.languageBcp47, props.selectedCategory, props.selectedFos, props.gameState]); // Re-fetch on game state change (e.g. login/logout might affect this, though game state is not auth state. Ideally listen to auth state)

    // Auto-collapse panel when game starts
    useEffect(() => {
        if (props.gameState === 'playing') {
            setIsLeftPanelOpen(false);
        }
    }, [props.gameState]);

    // Handle page selection from playlist
    const handlePageSelect = (bookId: string, chapterId: string, pageId: string) => {
        props.onSelectBookId(bookId);
        props.onSelectChapterId(chapterId);
        props.onSelectPageId(pageId);
    };

    // Override onStartGame to handle playlist page selection - rely on useGame to handle logic
    const handleStartGame = () => {
        // Normal game start - useGame hook handles fetching based on state (including playlist props)
        props.onStartGame();
    };

    useEffect(() => {
        if (props.gameState === 'idle') {
            setAnimationToShow(Math.random() < 0.5 ? 'pacman' : 'snake');
        }
    }, [props.gameState]);

    const handleDragEnter = (imageId: string) => setDropTargetId(imageId);
    const handleDragLeave = () => setDropTargetId(null);
    const onDropItem = (imageId: string, descriptionId: string) => {
        props.handleDrop(imageId, descriptionId);
        setDropTargetId(null); // Clear highlight on drop
    };

    const arePresetsDisabled = !props.orgData;

    useEffect(() => {
        if (arePresetsDisabled) {
            setExpandedSection('custom');
        }
    }, [arePresetsDisabled]);

    useEffect(() => {
        console.log('GameView orgData:', props.orgData);
    }, [props.orgData]);

    return (
        <div className="flex flex-col w-full">
            {/* Loading Screen for Playlist Page Fetch */}
            {/* Loading Screen for Playlist Page Fetch - handled by main loading screen now */}
            {/* {isLoadingPlaylistPage && ( ... )} */}

            {/* Main 3-Panel Layout */}
            <div className="flex flex-col lg:flex-row w-full p-4 gap-4 lg:p-8 lg:gap-8 relative min-h-[85vh]">
                {/* Toggle Button */}
                <button
                    onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                    className="absolute top-4 left-4 z-50 p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white shadow-lg transition-colors border border-slate-600"
                    aria-label={isLeftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <MenuIcon className="w-6 h-6" />
                </button>

                {/* Side Panel: 15% width when open, hidden when closed */}
                {isLeftPanelOpen && (
                    <div className="w-full lg:w-[15%] flex-shrink-0 transition-all duration-300 ease-in-out">
                        <SidePanel
                            languages={props.languages}
                            selectedLanguage={props.selectedLanguage}
                            onSelectLanguage={props.onSelectLanguage}
                            currentCategory={props.selectedCategory}
                            onSelectCategory={props.onSelectCategory}
                            currentFos={props.selectedFos}
                            onSelectFos={props.onSelectFos}
                            objectCategories={props.objectCategories}
                            fieldsOfStudy={props.fieldsOfStudy}
                            areCategoriesLoading={props.areCategoriesLoading}
                            currentDifficulty={props.difficulty}
                            onSelectDifficulty={props.onSelectDifficulty}
                            onStartGame={handleStartGame}
                            // onStartPlaylistGame={props.onStartPlaylistGame} removed
                            onWithdrawRequest={props.onWithdrawRequest}
                            gameState={props.gameState}
                            standardPlaylists={standardPlaylists}
                            selectedPlaylist={selectedPlaylist}
                            onSelectPlaylist={handleSelectPlaylist}
                            myTubSheets={myTubSheets}
                            selectedTubSheet={props.selectedTubSheet}
                            onSelectTubSheet={handleSelectTubSheet}
                            searchKeyword={props.searchKeyword}
                            onSearchKeywordChange={props.onSearchKeywordChange}
                            onSearch={handleSearch}
                            selectedPageId={props.selectedPageId}
                            onPageSelect={handlePageSelect}
                            expandedSection={expandedSection}
                            onExpandedSectionChange={setExpandedSection}
                            arePresetsDisabled={arePresetsDisabled}
                        />
                    </div>
                )}

                {/* Hints Panel: 45% width when open, 55% when closed */}
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[45%]' : 'lg:w-[55%]'} p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="text-center mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-slate-300">Hints</h2>
                        <p className="text-slate-400 mt-1 text-sm">Drag a hint to the matching object</p>
                    </header>
                    <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 flex-grow content-start">
                        {props.gameState === 'idle' && (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-slate-400 text-center text-lg">Choose your settings and click 'Play Game' to begin!</p>
                            </div>
                        )}
                        {(props.gameState === 'playing' || props.gameState === 'loading' || props.gameState === 'complete') && props.shuffledDescriptions.map((item, index) => (
                            <DraggableDescription
                                key={`desc-${item.id}`}
                                id={item.id}
                                description={item.description}
                                shortHint={item.short_hint}
                                objectName={item.imageName}
                                isMatched={props.correctlyMatchedIds.has(item.id)}
                                isWrongDrop={props.wrongDropSourceId === item.id}
                                isJustMatched={props.justMatchedId === item.id}
                                onSpeakHint={props.handleSpeakHint}
                                languageBcp47={props.languageBcp47}
                                label={(index + 1).toString()}
                            />
                        ))}
                    </div>
                </div>

                {/* Objects Panel: 40% width when open, 45% when closed */}
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[40%]' : 'lg:w-[45%]'} p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="text-center mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-slate-300">Objects</h2>
                        <div className="mt-1 text-2xl font-bold text-yellow-400">Score: {props.score}</div>
                    </header>
                    <div className="flex-grow overflow-y-auto pr-2 flex items-start">
                        {props.gameState === 'idle' ? (
                            <div className="h-full relative" aria-hidden="true">
                                {animationToShow === 'pacman' ? <PacManChaseAnimation /> : <SnakeGameAnimation />}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                                {(props.gameState === 'playing' || props.gameState === 'loading' || props.gameState === 'complete') && props.shuffledImages.map((item, index) => (
                                    <DroppableImage
                                        key={`img-${item.id}`}
                                        id={item.id}
                                        imageUrl={item.imageUrl}
                                        description={item.description}
                                        tooltipText={item.object_description}
                                        imageName={item.imageName}
                                        isMatched={props.correctlyMatchedIds.has(item.id)}
                                        onDropItem={onDropItem}
                                        isDropTarget={dropTargetId === item.id}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        isWrongDrop={props.wrongDropTargetId === item.id}
                                        isJustMatched={props.justMatchedId === item.id}
                                        onMatchedImageClick={props.handleMatchedImageClick}
                                        label={String.fromCharCode(65 + index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameView;