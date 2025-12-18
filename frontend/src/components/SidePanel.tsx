import React from 'react';
import { UserIcon, ChartBarIcon, QuestionMarkCircleIcon, InformationCircleIcon } from './Icons';
import { DIFFICULTY_LEVELS } from '../constants/gameConstants';
import type { Language, Difficulty, CategoryFosItem, PlaylistItem, TubSheetItem, GameObject } from '../types/types';
import PlaylistBrowser from './PlaylistBrowser';

interface SidePanelProps {
    languages: Language[];
    selectedLanguage: string;
    onSelectLanguage: (languageCode: string) => void;
    currentCategory: string;
    onSelectCategory: (category: string) => void;
    currentFos: string;
    onSelectFos: (fos: string) => void;
    objectCategories: CategoryFosItem[];
    fieldsOfStudy: CategoryFosItem[];
    areCategoriesLoading: boolean;
    currentDifficulty: Difficulty;
    onSelectDifficulty: (difficulty: Difficulty) => void;
    onStartGame: () => void;
    onWithdrawRequest: () => void;
    gameState: 'idle' | 'loading' | 'playing' | 'complete';
    standardPlaylists: PlaylistItem[];
    selectedPlaylist: string;
    onSelectPlaylist: (playlistId: string) => void;
    myTubSheets: TubSheetItem[];
    selectedTubSheet: string;
    onSelectTubSheet: (tubSheetId: string) => void;
    searchKeyword: string;
    onSearchKeywordChange: (keyword: string) => void;
    onSearch: () => void;
    selectedPageId: string | null;
    onPageSelect: (bookId: string, chapterId: string, pageId: string, bookTitle: string, chapterName: string, pageTitle: string) => void;
    expandedSection: 'presets' | 'custom';
    onExpandedSectionChange: (section: 'presets' | 'custom') => void;
    arePresetsDisabled?: boolean;
    isPlaylistDisabled?: boolean;
    isSavedCardDisabled?: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
    languages,
    selectedLanguage,
    onSelectLanguage,
    currentCategory,
    onSelectCategory,
    currentFos,
    onSelectFos,
    objectCategories,
    fieldsOfStudy,
    areCategoriesLoading,
    currentDifficulty,
    onSelectDifficulty,
    onStartGame,
    onWithdrawRequest,
    gameState,
    standardPlaylists,
    selectedPlaylist,
    onSelectPlaylist,
    myTubSheets,
    selectedTubSheet,
    onSelectTubSheet,
    searchKeyword,
    onSearchKeywordChange,
    onSearch,
    selectedPageId,
    onPageSelect,
    expandedSection,
    onExpandedSectionChange,
    arePresetsDisabled,
    isPlaylistDisabled,
    isSavedCardDisabled
}) => {
    // const [expandedSection, setExpandedSection] = React.useState<'presets' | 'custom'>('presets');

    const isInteractive = gameState === 'playing' || gameState === 'complete';
    const areSettingsDisabled = gameState === 'playing' || gameState === 'loading';
    const isButtonDisabled = gameState === 'loading' || areCategoriesLoading;

    const isCategoryDisabled = areSettingsDisabled || areCategoriesLoading || currentFos !== 'Any';
    const isFosDisabled = areSettingsDisabled || areCategoriesLoading || currentCategory !== 'Any';

    const toggleSection = (section: 'presets' | 'custom') => {
        if (section === 'presets' && arePresetsDisabled) return;
        onExpandedSectionChange(section);
    };

    // Mutual exclusion handlers - clear other fields when one is selected
    const handlePageSelectWithClear = (bookId: string, chapterId: string, pageId: string, bookTitle: string, chapterName: string, pageTitle: string) => {
        // Clear other search methods
        if (selectedTubSheet) onSelectTubSheet('');
        if (searchKeyword) onSearchKeywordChange('');
        if (currentCategory !== 'Any') onSelectCategory('Any');
        if (currentFos !== 'Any') onSelectFos('Any');
        onPageSelect(bookId, chapterId, pageId, bookTitle, chapterName, pageTitle);
    };

    const handleTubSheetSelectWithClear = (tubSheetId: string) => {
        if (tubSheetId) {
            // Clear other search methods
            if (searchKeyword) onSearchKeywordChange('');
            if (currentCategory !== 'Any') onSelectCategory('Any');
            if (currentFos !== 'Any') onSelectFos('Any');
            if (selectedPageId) onPageSelect('', '', '', '', '', '');
        }
        onSelectTubSheet(tubSheetId);
    };

    const handleKeywordChangeWithClear = (keyword: string) => {
        if (keyword.trim()) {
            // Clear other search methods when user types
            if (selectedTubSheet) onSelectTubSheet('');
            if (currentCategory !== 'Any') onSelectCategory('Any');
            if (currentFos !== 'Any') onSelectFos('Any');
        }
        onSearchKeywordChange(keyword);
    };

    const handleCategoryChangeWithClear = (category: string) => {
        if (category !== 'Any') {
            // Clear other search methods
            if (selectedTubSheet) onSelectTubSheet('');
            if (searchKeyword) onSearchKeywordChange('');
        }
        onSelectCategory(category);
    };

    const handleFosChangeWithClear = (fos: string) => {
        if (fos !== 'Any') {
            // Clear other search methods
            if (selectedTubSheet) onSelectTubSheet('');
            if (searchKeyword) onSearchKeywordChange('');
        }
        onSelectFos(fos);
    };

    return (
        <aside className="w-full lg:h-full bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col">
            <div className="p-4 text-center border-b border-slate-700">
                <img
                    src="/alphatub-logo-text.png"
                    alt="alphaTUB - Language Learning Simplified"
                    className="h-12 w-auto mx-auto object-contain"
                />
            </div>

            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Language Selector - Always visible */}
                <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-1">
                        Language <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <select
                            id="language-select"
                            value={selectedLanguage}
                            onChange={(e) => onSelectLanguage(e.target.value)}
                            disabled={areSettingsDisabled}
                            className="w-full appearance-none bg-slate-700 border border-slate-600 text-white py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {languages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Filters</label>
                    <div className="flex space-x-2 border-b border-slate-700 mb-4">
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${expandedSection === 'presets' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-300'} ${arePresetsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => toggleSection('presets')}
                            disabled={arePresetsDisabled}
                            title={arePresetsDisabled ? 'Presets are not available' : 'Show presets'}
                        >
                            Presets
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${expandedSection === 'custom' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-300'}`}
                            onClick={() => toggleSection('custom')}
                        >
                            Custom
                        </button>
                    </div>
                </div>

                {expandedSection === 'presets' && !arePresetsDisabled && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Playlists */}
                        <div className="h-64 flex flex-col">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Playlists</label>
                            <div className="flex-1 bg-slate-700/50 rounded-md p-2 border border-slate-600 overflow-hidden">
                                <PlaylistBrowser
                                    onPageSelect={handlePageSelectWithClear}
                                    disabled={areSettingsDisabled || isPlaylistDisabled}
                                    selectedLanguage={selectedLanguage}
                                    languages={languages}
                                    selectedPageId={selectedPageId}
                                />
                            </div>
                        </div>

                        {/* My Saved Cards */}
                        <div>
                            <label htmlFor="savedcard-select" className="block text-sm font-medium text-slate-300 mb-1">My Saved Cards</label>
                            <div className="relative">
                                <select
                                    id="savedcard-select"
                                    value={selectedTubSheet}
                                    onChange={(e) => handleTubSheetSelectWithClear(e.target.value)}
                                    disabled={areSettingsDisabled || isSavedCardDisabled}
                                    className="w-full appearance-none bg-slate-700 border border-slate-600 text-white py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    <option value="">Select a card...</option>
                                    {myTubSheets.map(tubsheet => (
                                        <option key={tubsheet.id} value={tubsheet.id}>{tubsheet.name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {expandedSection === 'custom' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Search Keywords */}
                        <div>
                            <label htmlFor="search-keywords" className="block text-sm font-medium text-slate-300 mb-1">Search your own keywords</label>
                            <input
                                id="search-keywords"
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => handleKeywordChangeWithClear(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !areSettingsDisabled && onStartGame()}
                                disabled={areSettingsDisabled}
                                placeholder="Enter keywords..."
                                className="w-full bg-slate-700 border border-slate-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder-slate-500"
                            />
                        </div>

                        {/* Category Selector */}
                        <div>
                            <label htmlFor="category-select" className="block text-sm font-medium text-slate-300 mb-1">Object Category</label>
                            <div className="relative">
                                <select
                                    id="category-select"
                                    value={currentCategory}
                                    onChange={(e) => handleCategoryChangeWithClear(e.target.value)}
                                    disabled={isCategoryDisabled}
                                    className="w-full appearance-none bg-slate-700 border border-slate-600 text-white py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {areCategoriesLoading ? (
                                        <option>Loading...</option>
                                    ) : (
                                        objectCategories.map(category => (
                                            <option key={category.en} value={category.en}>{category.translated}</option>
                                        ))
                                    )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Field of Study Selector */}
                        <div>
                            <label htmlFor="fos-select" className="block text-sm font-medium text-slate-300 mb-1">Field of Study</label>
                            <div className="relative">
                                <select
                                    id="fos-select"
                                    value={currentFos}
                                    onChange={(e) => handleFosChangeWithClear(e.target.value)}
                                    disabled={isFosDisabled}
                                    className="w-full appearance-none bg-slate-700 border border-slate-600 text-white py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {areCategoriesLoading ? (
                                        <option>Loading...</option>
                                    ) : (
                                        fieldsOfStudy.map(fos => (
                                            <option key={fos.en} value={fos.en}>{fos.translated}</option>
                                        ))
                                    )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                            <div className="px-2">
                                <div className="relative h-8 mb-6 select-none">
                                    {/* Track */}
                                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-600 rounded-full -translate-y-1/2"></div>

                                    {/* Dots */}
                                    <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2">
                                        {[0, 1, 2].map((step) => (
                                            <div
                                                key={step}
                                                className={`w-3 h-3 rounded-full border-2 ${DIFFICULTY_LEVELS.findIndex(d => d.name === currentDifficulty) >= step
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-slate-800 border-slate-600'
                                                    }`}
                                            ></div>
                                        ))}
                                    </div>

                                    {/* Invisible Range Input */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="1"
                                        value={DIFFICULTY_LEVELS.findIndex(d => d.name === currentDifficulty)}
                                        onChange={(e) => onSelectDifficulty(DIFFICULTY_LEVELS[parseInt(e.target.value)].name)}
                                        disabled={areSettingsDisabled}
                                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                        aria-label="Difficulty"
                                    />

                                    {/* Thumb */}
                                    <div
                                        className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-blue-600 -translate-y-1/2 pointer-events-none transition-all duration-150 ease-out"
                                        style={{
                                            left: `${(DIFFICULTY_LEVELS.findIndex(d => d.name === currentDifficulty) / 2) * 100}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    ></div>

                                    {/* Labels */}
                                    <div className="absolute top-8 left-0 right-0 flex justify-between text-xs text-slate-400 font-medium select-none pointer-events-none">
                                        <span className="-translate-x-1/4">Easy</span>
                                        <span>Medium</span>
                                        <span className="translate-x-1/4">Hard</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


            </div>

            <div className="p-4 border-t border-slate-700 mt-auto flex-shrink-0">
                <button
                    type="button"
                    onClick={isInteractive ? onWithdrawRequest : onStartGame}
                    disabled={isButtonDisabled}
                    className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:disabled:scale-100 hover:scale-105 ${isInteractive
                        ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                        : 'bg-green-600 hover:bg-green-500 focus:ring-green-500'
                        }`}
                >
                    {areCategoriesLoading ? 'Processing...' : (isInteractive ? 'Withdraw' : 'Play Game')}
                </button>
            </div>
        </aside >
    );
};

export default SidePanel;