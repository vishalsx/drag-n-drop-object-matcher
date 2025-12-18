import React, { useState, useEffect } from 'react';
import DraggableDescription from '../components/DraggableDescription';
import DroppableImage from '../components/DroppableImage';
import SidePanel from '../components/SidePanel';
import LoadingScreen from './LoadingScreen';
import { MenuIcon, BookOpenIcon, VolumeOffIcon, VolumeUpIcon } from '../components/Icons';
import YouTubeEmbed from '../components/YouTubeEmbed';
import ImageZoomModal from '../components/ImageZoomModal';

// Fix: Import CategoryFosItem to resolve type errors.
import type { GameObject, Difficulty, Language, CategoryFosItem, PlaylistItem, TubSheetItem } from '../types/types';
import PacManChaseAnimation from '../components/PacManChaseAnimation';
import SnakeGameAnimation from '../components/SnakeGameAnimation';
import PacManLoader from '../components/PacManLoader';
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
    selectedLanguageName: string;
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
    onSelectBookTitle: (title: string) => void;
    onSelectChapterName: (name: string) => void;
    onSelectPageTitle: (title: string) => void;
    selectedPageId: string | null;
    selectedBookTitle: string;
    selectedChapterName: string;
    selectedPageTitle: string;
    userId: string | null;
}

const GameView: React.FC<GameViewProps> = (props) => {
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [animationToShow, setAnimationToShow] = useState<'pacman' | 'snake'>('pacman');
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const isPlaylistDisabled = !props.orgData;
    const isSavedCardDisabled = !props.userId;
    const arePresetsDisabled = isPlaylistDisabled && isSavedCardDisabled;

    const [expandedSection, setExpandedSection] = useState<'presets' | 'custom'>(arePresetsDisabled ? 'custom' : 'presets');
    const [showStory, setShowStory] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<{ url: string, name: string } | null>(null);
    const [isVideoMuted, setIsVideoMuted] = useState(true); // Default to muted as per common web practices for autoplay


    // Video randomization logic
    const VIDEO_IDS = [
        '6LM2Fi2aOTw',
        'ibpP7w5MY_o',
        'amTmnnqQf_E',
        'Q246wlwKgso',
        '7fJtmMbz4tY',
        'cWZZWclYIgc'
    ];


    // Function to get a random video ID
    const getRandomVideoId = (excludeId?: string) => {
        const availableIds = excludeId ? VIDEO_IDS.filter(id => id !== excludeId) : VIDEO_IDS;
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        return availableIds[randomIndex];
    };

    const [currentVideoId, setCurrentVideoId] = useState(() => getRandomVideoId());

    const handleVideoEnd = () => {
        setCurrentVideoId(prevId => getRandomVideoId(prevId));
    };

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

    // Reset selected playlist when language changes
    useEffect(() => {
        setSelectedPlaylist('');
    }, [props.selectedLanguage]);

    // Handle page selection from playlist
    const handlePageSelect = (bookId: string, chapterId: string, pageId: string, bookTitle: string, chapterName: string, pageTitle: string) => {
        props.onSelectBookId(bookId);
        props.onSelectChapterId(chapterId);
        props.onSelectPageId(pageId);
        props.onSelectBookTitle(bookTitle);
        props.onSelectChapterName(chapterName);
        props.onSelectPageTitle(pageTitle);
    };

    // Override onStartGame to handle playlist page selection - rely on useGame to handle logic
    const handleStartGame = () => {
        // Normal game start - useGame hook handles fetching based on state (including playlist props)
        props.onStartGame();
    };

    useEffect(() => {
        if (props.gameState === 'idle') {
            setAnimationToShow(Math.random() < 0.5 ? 'pacman' : 'snake');
            setShowStory(false);
        }
    }, [props.gameState]);

    const handleDragEnter = (imageId: string) => setDropTargetId(imageId);
    const handleDragLeave = () => setDropTargetId(null);
    const onDropItem = (imageId: string, descriptionId: string) => {
        props.handleDrop(imageId, descriptionId);
        setDropTargetId(null); // Clear highlight on drop
    };

    const handleImageDoubleClick = (imageUrl: string, imageName: string) => {
        setZoomedImage({ url: imageUrl, name: imageName });
    };

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
                            isPlaylistDisabled={isPlaylistDisabled}
                            isSavedCardDisabled={isSavedCardDisabled}
                        />
                    </div>
                )}

                {/* Hints Panel: 45% width when open, 55% when closed */}
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[45%]' : 'lg:w-[55%]'} p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="text-center mb-6 flex-shrink-0 relative">
                        {(props.gameState === 'playing' || props.gameState === 'complete') && (
                            <button
                                onClick={() => setShowStory(!showStory)}
                                disabled={!(props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral)}
                                className={`absolute right-0 top-0 p-2 transition-colors ${(props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral)
                                    ? 'text-slate-400 hover:text-white'
                                    : 'text-slate-600 cursor-not-allowed opacity-40'
                                    }`}
                                title={(props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral) ? (showStory ? "Show Hints" : "Show Story") : "Story not available for this page"}
                            >
                                <BookOpenIcon className="w-6 h-6" />
                            </button>
                        )}
                        <h2 className="text-2xl font-bold text-slate-300">{(showStory && props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral) ? 'Story' : 'Hints'}</h2>
                        <p className="text-slate-400 mt-1 text-sm">
                            {(showStory && props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral) ? 'Read the story' : 'Drag a hint to the matching object'}
                        </p>
                    </header>
                    <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 flex-grow content-start">
                        {showStory && props.shuffledDescriptions[0]?.story && props.shuffledDescriptions[0]?.moral ? (
                            <div className="p-4 text-slate-300 text-lg leading-relaxed">
                                <h3 className="text-xl font-semibold mb-4 text-teal-400">The Story</h3>
                                <p className="mb-4 whitespace-pre-wrap">{props.shuffledDescriptions[0].story}</p>
                                <div className="mt-6 p-4 bg-teal-900/30 rounded-lg border border-teal-700/50">
                                    <span className="font-bold text-teal-300 text-xl block mb-2">Moral:</span>
                                    <p className="italic text-slate-200 text-xl">{props.shuffledDescriptions[0].moral}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {props.gameState === 'idle' && (
                                    <div className="h-full flex flex-col items-center justify-between p-2">
                                        {/* Video Container */}
                                        <div className="w-full flex-grow flex items-center justify-center mb-4 rounded-lg overflow-hidden bg-black/40 relative group/video">
                                            <div className="absolute inset-0 z-10" />
                                            <YouTubeEmbed
                                                videoId={currentVideoId}
                                                onEnded={handleVideoEnd}
                                                muted={isVideoMuted}
                                                className="aspect-[9/16] h-full w-full max-h-[50vh]"
                                            />
                                            {/* Mute toggle button */}
                                            <button
                                                onClick={() => setIsVideoMuted(!isVideoMuted)}
                                                className="absolute bottom-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all opacity-0 group-hover/video:opacity-100 focus:opacity-100"
                                                title={isVideoMuted ? "Unmute" : "Mute"}
                                            >
                                                {isVideoMuted ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                                            </button>
                                        </div>

                                        {/* Instructions */}
                                        <div className="w-full text-center pb-8">
                                            <p className="text-slate-400 text-lg">Choose your settings and click 'Play Game' to begin!</p>
                                        </div>
                                    </div>
                                )}
                                {props.gameState === 'loading' && (
                                    <div className="h-full flex flex-col items-center justify-between p-2">
                                        {/* Video Container - Loading State (Using same video for continuity or random, using currentVideoId) */}
                                        <div className="w-full flex-grow flex items-center justify-center mb-4 rounded-lg overflow-hidden bg-black/40 relative group/video">
                                            <div className="absolute inset-0 z-10" />
                                            <YouTubeEmbed
                                                videoId={currentVideoId}
                                                onEnded={handleVideoEnd}
                                                muted={isVideoMuted}
                                                className="aspect-[9/16] h-full w-full max-h-[50vh]"
                                            />
                                            {/* Mute toggle button */}
                                            <button
                                                onClick={() => setIsVideoMuted(!isVideoMuted)}
                                                className="absolute bottom-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all opacity-0 group-hover/video:opacity-100 focus:opacity-100"
                                                title={isVideoMuted ? "Unmute" : "Mute"}
                                            >
                                                {isVideoMuted ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                                            </button>
                                        </div>

                                        {/* Loading Details */}
                                        <div className="w-full text-center">
                                            <h2 className="text-xl font-bold text-teal-300 mb-2">Loading Game...</h2>
                                            <p className="text-slate-400 mb-4">
                                                {props.selectedPageId && props.selectedBookTitle ? (
                                                    // Loading from playlist
                                                    <>
                                                        Loading <span className="font-semibold text-white">Playlist</span> content from <span className="font-semibold text-white">{props.selectedPageTitle || 'selected page'}</span> in <span className="font-semibold text-white">{props.selectedBookTitle || 'selected book'}</span>.
                                                    </>
                                                ) : props.selectedTubSheet ? (
                                                    // Loading from tubsheet
                                                    <>
                                                        Loading <span className="font-semibold text-white">Saved Cards</span> in <span className="font-semibold text-white">{props.selectedLanguageName}</span>.
                                                    </>
                                                ) : props.searchKeyword ? (
                                                    // Loading from keyword search
                                                    <>
                                                        Loading <span className="font-semibold text-white">{props.difficulty}</span> game with keyword <span className="font-semibold text-white">"{props.searchKeyword}"</span> in <span className="font-semibold text-white">{props.selectedLanguageName}</span>.
                                                    </>
                                                ) : (
                                                    // Default: using category/field of study
                                                    <>
                                                        Preparing a <span className="font-semibold text-white">{props.difficulty}</span> game in <span className="font-semibold text-white">{props.selectedLanguageName}</span>{props.selectedCategory !== 'Any' ? ` (${props.selectedCategory})` : props.selectedFos !== 'Any' ? ` (${props.selectedFos})` : ''}.
                                                    </>
                                                )}
                                            </p>
                                            <div className="flex justify-center">
                                                <PacManLoader />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(props.gameState === 'playing' || props.gameState === 'complete') && props.shuffledDescriptions.map((item, index) => (
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
                            </>
                        )}
                    </div>
                </div>

                {/* Objects Panel: 40% width when open, 45% when closed */}
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[40%]' : 'lg:w-[45%]'} p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="text-center mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-slate-300">Objects</h2>
                        <div className="mt-1 text-2xl font-bold text-yellow-400">Score: {props.score}</div>
                    </header>
                    <div className="flex-grow overflow-y-auto pr-2 flex items-start">
                        {props.gameState === 'idle' || props.gameState === 'loading' ? (
                            <div className="w-full h-full relative" aria-hidden="true">
                                {animationToShow === 'pacman' ? <PacManChaseAnimation /> : <SnakeGameAnimation />}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                                {(props.gameState === 'playing' || props.gameState === 'complete') && props.shuffledImages.map((item, index) => (
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
                                        onImageDoubleClick={handleImageDoubleClick}
                                        label={String.fromCharCode(65 + index)}
                                    />

                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {zoomedImage && (
                <ImageZoomModal
                    imageUrl={zoomedImage.url}
                    onClose={() => setZoomedImage(null)}
                />
            )}

        </div>
    );
};

export default GameView;