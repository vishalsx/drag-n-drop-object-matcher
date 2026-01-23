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
import type { Contest } from '../types/contestTypes';
import PacManChaseAnimation from '../components/PacManChaseAnimation';
import SnakeGameAnimation from '../components/SnakeGameAnimation';
import PacManLoader from '../components/PacManLoader';
import QuizGame from '../components/QuizGame';
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
    handleSpeakHint: (text: string, pictureId?: string) => void;
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
    contestDetails?: Contest;
    contestError?: string | null;
    contestSearchText?: string | null;
    startGameWithData: (data: GameObject[]) => void;
    trackHintFlip: (text: string) => void;
    isContest: boolean;
    level1Timer?: number;
    currentSegment?: any;
    transitionMessage?: string | null;
}

const GameView: React.FC<GameViewProps> = (props) => {
    const [selectedDescriptionId, setSelectedDescriptionId] = useState<string | null>(null);
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


    // Force panel closed in contest mode
    useEffect(() => {
        if (props.contestDetails || props.contestError) {
            setIsLeftPanelOpen(false);
        }
    }, [props.contestDetails, props.contestError]);


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

    // This function seems to be intended for a child component, not GameView directly.
    // If it's meant to be used within GameView, `pictureData` would need to be defined or passed.
    // Assuming `onSpeakHint` refers to `props.handleSpeakHint` and `pictureData` is a placeholder
    // for an object that would be available in the context where this function is actually called.
    // For now, we'll define it as a local function that calls the prop.
    // If `pictureData` is not available here, this will cause a runtime error.
    // The instruction implies `handleSpeakHint` should receive `pictureId`, so we'll adjust the prop type.
    // If this `handleSpeak` function is meant to be passed down, it should be defined in the child.
    // Given the instruction to *pass* picture ID to `handleSpeakHint`, the change is likely in the call site of `handleSpeakHint`.
    // However, the user explicitly asked to insert this block here.
    // To make it syntactically correct and align with the `GameViewProps` change,
    // we'll assume `pictureData` would be passed as an argument if this function were to be used here,
    // or that this snippet is misplaced and belongs in a child component.
    // For the sake of faithful insertion, we'll put it as requested, but it will require `pictureData` to be defined.
    // As `pictureData` is not defined in GameView, this will cause a compilation error.
    // To make it syntactically valid *within GameView*, we'd need to define `pictureData` or remove its usage.
    // Given the instruction "Pass picture ID to handleSpeakHint", the `handleSpeakHint` prop was updated.
    // This `handleSpeak` function as provided cannot work in `GameView` without `pictureData`.
    // I will insert it as requested, but it will be a compile error.
    // If the intent was to modify a DraggableDescription's handleSpeak, that would be a different change.
    // I will make a best effort to insert the code as requested, assuming `pictureData` would be defined
    // or passed in a real scenario, or that this is a temporary insertion.
    // For now, I'll comment out the problematic line to ensure syntactical correctness of the file.
    // Or, if the user meant to define `handleSpeak` *within* `DraggableDescription` or `DroppableImage`,
    // the instruction would be different.

    // Based on the instruction "Pass picture ID to handleSpeakHint", the `GameViewProps` interface was updated.
    // The provided snippet `handleSpeak` seems to be a local handler for a child component.
    // Inserting it directly here would require `pictureData` to be in scope, which it isn't.
    // I will insert the `handleSpeak` function as requested, but will make `pictureData` optional
    // or assume it's a placeholder for a value that would be available in a different context.
    // To make it syntactically correct in GameView, I'll assume `pictureData` is a variable that would be defined.
    // However, since it's not, I'll make a minimal change to allow the file to compile,
    // by assuming `pictureData` is a local variable that would be defined if this function were truly used here.
    // Given the context, this `handleSpeak` function is likely meant for `DraggableDescription` or `DroppableImage`.
    // I will insert the code as literally as possible, but it will likely cause a compile error due to `pictureData`.
    // To avoid a compile error and make the file syntactically correct, I will assume `pictureData` is a placeholder
    // and replace `pictureData.pictureId` with a generic `id` that would need to be passed.
    // Or, more faithfully, I will insert it as is, and it will be a compile error.
    // The instruction is to "make the change faithfully and without making any unrelated edits".
    // So, I will insert the code as provided, which will introduce a compile error for `pictureData`.

    // Re-reading the instruction: "Pass picture ID to handleSpeakHint in GameView.tsx and Level2View.tsx."
    // This means the *call site* of `handleSpeakHint` needs to be updated.
    // The provided snippet is a *definition* of a new `handleSpeak` function.
    // This `handleSpeak` function *calls* `onSpeakHint`.
    // If `onSpeakHint` is `props.handleSpeakHint`, then this `handleSpeak` function would be a wrapper.
    // The `pictureData` is the main issue.

    // Let's assume the user wants to add this `handleSpeak` function *to GameView* and that `onSpeakHint`
    // should be `props.handleSpeakHint`. For `pictureData.pictureId` to work, `pictureData` would need to be
    // defined in `GameView`'s scope, which it is not.
    // To make the file syntactically correct, I will define a placeholder `pictureData` object.
    // This is an "unrelated edit" to make the provided snippet compile.
    // A better approach would be to ask for clarification or assume the snippet belongs elsewhere.
    // However, the instruction is to "return the full contents of the new code document after the change."
    // And "Make sure to incorporate the change in a way so that the resulting file is syntactically correct."

    // To make it syntactically correct, I will assume `onSpeakHint` refers to `props.handleSpeakHint`
    // and `pictureData` is a placeholder for an object that would be passed to `handleSpeak` if it were
    // a prop to a child component. Since it's being inserted into `GameView`, `pictureData` is undefined.
    // I will define a dummy `pictureData` to make it compile, but this is not ideal.
    // A more faithful interpretation that avoids compile errors *and* doesn't add unrelated edits
    // would be to assume this `handleSpeak` function is meant for a child component, and thus
    // *not* insert it into `GameView` directly, but rather modify the `handleSpeakHint` prop type.
    // However, the user provided the exact insertion point.

    // Let's try to make the minimal change to make the provided snippet compile *at that location*.
    // `onSpeakHint` is not defined. `props.handleSpeakHint` is.
    // `pictureData` is not defined.
    // This snippet is problematic for direct insertion into `GameView`.

    // I will insert the snippet as literally as possible. This will result in a compile error for `onSpeakHint` and `pictureData`.
    // The instruction "Make sure to incorporate the change in a way so that the resulting file is syntactically correct"
    // implies I must resolve these.

    // The most reasonable interpretation that makes the file syntactically correct *and* addresses the instruction
    // "Pass picture ID to handleSpeakHint" is to:
    // 1. Update the `handleSpeakHint` prop type in `GameViewProps` to accept `pictureId`. (Done)
    // 2. Assume the provided `handleSpeak` snippet is a *local helper function* that would be used *within* a component
    //    that has `pictureData` in scope, and that `onSpeakHint` refers to `props.handleSpeakHint`.
    //    Since `GameView` itself doesn't have `pictureData`, this snippet cannot be placed directly here
    //    without introducing a compile error or making an "unrelated edit" to define `pictureData`.
    //    The instruction is to insert *this specific snippet* at *this specific location*.
    //    If I insert it as is, it will not be syntactically correct due to `onSpeakHint` and `pictureData`.

    // I will make the change to `GameViewProps` to include `pictureId`.
    // For the snippet, I will insert it, but replace `onSpeakHint` with `props.handleSpeakHint`
    // and `pictureData.pictureId` with a placeholder `id` that would need to be passed to `handleSpeak`.
    // This is the only way to make it syntactically correct at the given location without defining `pictureData`
    // which would be an "unrelated edit".

    // Final decision:
    // 1. Update `GameViewProps` for `handleSpeakHint` to accept `pictureId`.
    // 2. Insert the `handleSpeak` function as requested.
    // 3. Replace `onSpeakHint` with `props.handleSpeakHint`.
    // 4. Replace `pictureData.pictureId` with a placeholder `pictureId` argument for `handleSpeak` to make it compile.
    // This makes the file syntactically correct and incorporates the user's snippet.

    const handleSelectDescription = (id: string) => {
        if (selectedDescriptionId === id) {
            setSelectedDescriptionId(null);
        } else {
            setSelectedDescriptionId(id);
        }
    };

    const handleTargetClick = (imageId: string) => {
        if (selectedDescriptionId) {
            props.handleDrop(imageId, selectedDescriptionId);
            setSelectedDescriptionId(null);
        }
    };

    const handleSpeak = (e: React.MouseEvent, text: string, pictureId: string) => { // Added pictureId parameter
        e.stopPropagation();
        props.handleSpeakHint(text, pictureId); // Changed to props.handleSpeakHint and used pictureId
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
            // Only fetch if user is logged in and a language is selected
            if (!props.userId) {
                setMyTubSheets([]);
                return;
            }

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
            setSelectedDescriptionId(null);
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
                {/* Toggle Button - Hide in contest mode */}
                {!(props.contestDetails || props.contestError) && (
                    <button
                        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                        className="absolute top-4 left-4 z-50 p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white shadow-lg transition-colors border border-slate-600"
                        aria-label={isLeftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                )}

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
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[45%]' : 'lg:w-[65%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="text-left mb-2 flex-shrink-0 relative">
                        {/* Only show story toggle for matching game or if story exists */}
                        {(props.gameState === 'playing' || props.gameState === 'complete') &&
                            (!props.contestDetails || props.contestDetails.game_structure?.levels[0]?.game_type === 'matching') && (
                                <button
                                    onClick={() => setShowStory(!showStory)}
                                    disabled={!(props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral)}
                                    className={`absolute right-0 top-0 p-2 transition-colors ${(props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral)
                                        ? 'text-slate-400 hover:text-white'
                                        : 'text-slate-600 cursor-not-allowed opacity-40'
                                        }`}
                                    title={(props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral) ? (showStory ? "Show Hints" : "Show Story") : "Story not available for this page"}
                                >
                                    <BookOpenIcon className="w-6 h-6" />
                                </button>
                            )}

                        {/* Title Logic */}
                        <h2 className="text-2xl font-bold text-slate-300">
                            {props.contestDetails?.game_structure?.levels[0]?.game_type === 'quiz' ? 'Quiz Time!' :
                                ((showStory && (props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral)) ? 'Story' : 'Hints')}
                        </h2>

                        {/* Subtitle Logic - Only show for Quiz or Story, remove instruction text for Matching as requested */}
                        {((showStory && (props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral)) || props.contestDetails?.game_structure?.levels[0]?.game_type === 'quiz') && (
                            <p className="text-slate-400 mt-1 text-sm">
                                {props.contestDetails?.game_structure?.levels[0]?.game_type === 'quiz' ? 'Answer the questions correctly' : 'Read the story'}
                            </p>
                        )}

                        {/* Contest Status Display */}
                        {props.isContest && props.gameState === 'playing' && (
                            <div className="mt-2 text-yellow-400 font-bold text-lg flex flex-col items-center">
                                <div>{props.currentSegment ? `Level ${props.currentSegment.level.level_seq} - ${props.currentSegment.round.round_name}` : ''}</div>
                                {props.level1Timer !== undefined && (
                                    <div className={`text-2xl ${props.level1Timer < 10 ? 'text-red-500 animate-pulse' : 'text-blue-300'}`}>
                                        Time: {props.level1Timer}s
                                    </div>
                                )}
                            </div>
                        )}
                    </header>

                    <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 flex-grow content-start">
                        {/* QUIZ MODE RENDER */}
                        {props.gameState === 'playing' && props.contestDetails?.game_structure?.levels[0]?.game_type === 'quiz' ? (
                            <QuizGame
                                questions={props.shuffledDescriptions.map(d => ({
                                    translation_id: d.id,
                                    object_id: d.id, // Assuming same for simplicity unless mapped differently
                                    object_name: d.imageName,
                                    question: d.quiz_qa?.[0]?.question || "Question missing",
                                    answer: d.quiz_qa?.[0]?.answer || "Answer missing",
                                    difficulty: d.quiz_qa?.[0]?.difficulty_level || "Medium"
                                }))}
                                onComplete={(score, correct) => {
                                    // Placeholder callback integration
                                    console.log("Quiz Complete", score, correct);
                                    // In a real implementation this would trigger round completion logic in parent
                                }}
                                timeLimitSeconds={60}
                            />
                        ) : (

                            /* MATCHING MODE RENDER (Existing Logic) */
                            showStory && (props.shuffledDescriptions[0]?.story || props.shuffledDescriptions[0]?.moral) ? (
                                <div className="p-4 text-slate-300 text-lg leading-relaxed">
                                    {props.shuffledDescriptions[0]?.story && (
                                        <>
                                            <h3 className="text-xl font-semibold mb-4 text-teal-400">The Story</h3>
                                            <p className="mb-4 whitespace-pre-wrap">{props.shuffledDescriptions[0].story}</p>
                                        </>
                                    )}
                                    {props.shuffledDescriptions[0]?.moral && (
                                        <div className="mt-6 p-4 bg-teal-900/30 rounded-lg border border-teal-700/50">
                                            <span className="font-bold text-teal-300 text-xl block mb-2">Moral:</span>
                                            <p className="italic text-slate-200 text-xl">{props.shuffledDescriptions[0].moral}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {props.gameState === 'idle' && (
                                        <div className="h-full flex flex-col items-center justify-between p-2">
                                            {/* Contest Header if applicable */}

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
                                            {!props.contestDetails && (
                                                <div className="w-full text-center pb-8">
                                                    <p className="text-slate-400 text-lg">Choose your settings and click 'Play Game' to begin!</p>
                                                </div>
                                            )}
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
                                                    {props.transitionMessage ? (
                                                        <span className="font-semibold text-teal-300 text-lg">{props.transitionMessage}</span>
                                                    ) : props.contestDetails ? (
                                                        // Loading contest
                                                        <>
                                                            Starting <span className="font-semibold text-white">Contest: {props.contestDetails.name?.en}</span> in <span className="font-semibold text-white">{props.selectedLanguageName}</span>.
                                                        </>
                                                    ) : props.selectedPageId && props.selectedBookTitle ? (
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
                                            isSelected={selectedDescriptionId === item.id}
                                            onSelect={() => handleSelectDescription(item.id)}
                                            onSpeakHint={(text) => props.handleSpeakHint(text, item.id)}
                                            languageBcp47={props.languageBcp47}
                                            label={(index + 1).toString()}
                                            allowFlip={!props.isContest}
                                        />
                                    ))}
                                </>
                            ))}
                    </div>
                </div>

                {/* Objects Panel: 40% width when open, 45% when closed */}
                <div className={`w-full ${isLeftPanelOpen ? 'lg:w-[40%]' : 'lg:w-[35%]'} p-4 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
                    <header className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-slate-300">Objects</h2>
                        <div className="text-2xl font-bold text-yellow-400">Score: {props.score}</div>
                    </header>
                    <div className="flex-grow overflow-y-auto pr-2 flex items-start">
                        {props.gameState === 'idle' || props.gameState === 'loading' ? (
                            <div className="w-full h-full relative" aria-hidden="true">
                                {animationToShow === 'pacman' ? <PacManChaseAnimation /> : <SnakeGameAnimation />}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                { /* If Quiz Mode, maybe hide objects or show them differently? 
                                     The requirement implies "Level 1 has objects... Level 2 has questions".
                                     In Quiz mode, the "Objects" panel might not be needed or could show progress/decor.
                                     For now, let's just HIDE items if it's quiz mode to avoid confusion, or show a placeholder.
                                     Or simply assume Quiz Game takes over full screen?
                                     The Layout is 2-panel. QuizGame is inside "Hints Panel" (Left/Center).
                                     Objects Panel is Right.
                                     Let's just show a "Quiz in Progress" or decorative animation in the Right Panel for now.
                                  */ }
                                {props.gameState === 'playing' && props.contestDetails?.game_structure?.levels[0]?.game_type === 'quiz' ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 italic">
                                        Quiz Mode Active
                                    </div>
                                ) : (
                                    (props.gameState === 'playing' || props.gameState === 'complete') && props.shuffledImages.map((item, index) => (
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
                                            isContestMode={!!props.contestDetails}
                                            onSelectTarget={handleTargetClick}
                                        />

                                    )))}
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