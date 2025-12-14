import React, { useState, useEffect } from 'react';
import { UserIcon, ChartBarIcon } from './Icons';
import { DIFFICULTY_LEVELS } from '../constants/gameConstants';
import type { Language, Difficulty, CategoryFosItem, TubSheetItem } from '../types/types';
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
    myTubSheets: TubSheetItem[];
    selectedTubSheet: string;
    onSelectTubSheet: (tubSheetId: string) => void;
    searchKeyword: string;
    onSearchKeywordChange: (keyword: string) => void;
    onSearch: () => void;
    selectedPageId: string | null;
    onPageSelect: (bookId: string, chapterId: string, pageId: string) => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearchQuery: () => void;
}

type SearchType = 'none' | 'playlist' | 'savedCard' | 'searchQuery' | 'keyword' | 'category';

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
    myTubSheets,
    selectedTubSheet,
    onSelectTubSheet,
    searchKeyword,
    onSearchKeywordChange,
    onSearch,
    selectedPageId,
    onPageSelect,
    searchQuery,
    onSearchQueryChange,
    onSearchQuery,
}) => {
    const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
    const [activeSearchType, setActiveSearchType] = useState<SearchType>('none');

    const isInteractive = gameState === 'playing' || gameState === 'complete';
    const areSettingsDisabled = gameState === 'playing' || gameState === 'loading';
    const isButtonDisabled = gameState === 'loading' || areCategoriesLoading;

    // Update active search type based on selections
    useEffect(() => {
        if (selectedPageId) setActiveSearchType('playlist');
        else if (selectedTubSheet) setActiveSearchType('savedCard');
        else if (searchQuery.trim()) setActiveSearchType('searchQuery');
        else if (searchKeyword.trim()) setActiveSearchType('keyword');
        else if (currentCategory !== 'Any' || currentFos !== 'Any') setActiveSearchType('category');
        else setActiveSearchType('none');
    }, [selectedPageId, selectedTubSheet, searchQuery, searchKeyword, currentCategory, currentFos]);

    // Clear other selections when one is selected
    const handlePageSelect = (bookId: string, chapterId: string, pageId: string) => {
        onSelectTubSheet('');
        onSearchQueryChange('');
        onSearchKeywordChange('');
        if (currentCategory !== 'Any') onSelectCategory('Any');
        if (currentFos !== 'Any') onSelectFos('Any');
        onPageSelect(bookId, chapterId, pageId);
    };

    const handleTubSheetSelect = (tubSheetId: string) => {
        onSelectTubSheet(tubSheetId);
        if (tubSheetId) {
            onSearchQueryChange('');
            onSearchKeywordChange('');
            if (currentCategory !== 'Any') onSelectCategory('Any');
            if (currentFos !== 'Any') onSelectFos('Any');
        }
    };

    const handleSearchQueryChange = (query: string) => {
        onSearchQueryChange(query);
        if (query.trim()) {
            onSelectTubSheet('');
            onSearchKeywordChange('');
            if (currentCategory !== 'Any') onSelectCategory('Any');
            if (currentFos !== 'Any') onSelectFos('Any');
        }
    };

    const handleKeywordChange = (keyword: string) => {
        onSearchKeywordChange(keyword);
        if (keyword.trim()) {
            onSelectTubSheet('');
            onSearchQueryChange('');
        }
    };

    const handleCategoryChange = (category: string) => {
        onSelectCategory(category);
        if (category !== 'Any') {
            onSelectTubSheet('');
            onSearchQueryChange('');
            onSearchKeywordChange('');
        }
    };

    const handleFosChange = (fos: string) => {
        onSelectFos(fos);
        if (fos !== 'Any') {
            onSelectTubSheet('');
            onSearchQueryChange('');
            onSearchKeywordChange('');
        }
    };

    const handleStartGame = () => {
        if (!selectedLanguage) {
            alert('Please select a language first');
            return;
        }
        onStartGame();
    };

    // Mutual exclusion logic
    const isPlaylistDisabled = areSettingsDisabled || (activeSearchType !== 'none' && activeSearchType !== 'playlist');
    const isSavedCardDisabled = areSettingsDisabled || (activeSearchType !== 'none' && activeSearchType !== 'savedCard');
    const isSearchQueryDisabled = areSettingsDisabled || (activeSearchType !== 'none' && activeSearchType !== 'searchQuery');
    const isKeywordDisabled = areSettingsDisabled || (activeSearchType !== 'none' && activeSearchType !== 'keyword');
    const isCategoryDisabled = areSettingsDisabled || areCategoriesLoading || (activeSearchType !== 'none' && activeSearchType !== 'category');
    const isFosDisabled = areSettingsDisabled || areCategoriesLoading || (activeSearchType !== 'none' && activeSearchType !== 'category');

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

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-600">
                    <button
                        onClick={() => setActiveTab('preset')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'preset'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        Preset
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'custom'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        Custom
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'preset' ? (
                    <div className="space-y-4">
                        {/* Search Query */}
                        <div>
                            <label htmlFor="search-query" className="block text-sm font-medium text-slate-300 mb-1">Search Query</label>
                            <div className="flex gap-2">
                                <input
                                    id="search-query"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isSearchQueryDisabled && onSearchQuery()}
                                    disabled={isSearchQueryDisabled}
                                    placeholder="Search..."
                                    className="flex-1 bg-slate-700 border border-slate-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder-slate-500"
                                />
                                <button
                                    type="button"
                                    onClick={onSearchQuery}
                                    disabled={isSearchQueryDisabled || !searchQuery.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Playlists */}
                        <div className="h-64 flex flex-col">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Playlists</label>
                            <div className={`flex-1 bg-slate-700/50 rounded-md p-2 border border-slate-600 overflow-hidden ${isPlaylistDisabled ? 'opacity-50' : ''}`}>
                                <PlaylistBrowser
                                    onPageSelect={handlePageSelect}
                                    disabled={isPlaylistDisabled}
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
                                    onChange={(e) => handleTubSheetSelect(e.target.value)}
                                    disabled={isSavedCardDisabled}
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
                ) : (
                    <div className="space-y-4">
                        {/* Search Keywords */}
                        <div>
                            <label htmlFor="search-keywords" className="block text-sm font-medium text-slate-300 mb-1">Search your own keywords</label>
                            <div className="flex gap-2">
                                <input
                                    id="search-keywords"
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(e) => handleKeywordChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isKeywordDisabled && onSearch()}
                                    disabled={isKeywordDisabled}
                                    placeholder="Enter keywords..."
                                    className="flex-1 bg-slate-700 border border-slate-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder-slate-500"
                                />
                                <button
                                    type="button"
                                    onClick={onSearch}
                                    disabled={isKeywordDisabled || !searchKeyword.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Category Selector */}
                        <div>
                            <label htmlFor="category-select" className="block text-sm font-medium text-slate-300 mb-1">Object Category</label>
                            <div className="relative">
                                <select
                                    id="category-select"
                                    value={currentCategory}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
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
                                    onChange={(e) => handleFosChange(e.target.value)}
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
                            <fieldset className="space-y-2">
                                <legend className="sr-only">Choose a difficulty level</legend>
                                {DIFFICULTY_LEVELS.map(({ name, label }) => (
                                    <div key={name} className="flex items-center">
                                        <input
                                            type="radio"
                                            id={`difficulty-${name}`}
                                            name="difficulty"
                                            value={name}
                                            checked={currentDifficulty === name}
                                            onChange={() => onSelectDifficulty(name)}
                                            disabled={areSettingsDisabled}
                                            className="h-4 w-4 bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                        />
                                        <label
                                            htmlFor={`difficulty-${name}`}
                                            className="ml-3 block text-sm font-medium text-slate-300 cursor-pointer"
                                        >
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </fieldset>
                        </div>
                    </div>
                )}

                {/* Profile Section */}
                <section>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Profile</h2>
                    <div className="space-y-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md transition-colors">
                            <UserIcon className="w-5 h-5" />
                            <span>User Profile</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md transition-colors">
                            <ChartBarIcon className="w-5 h-5" />
                            <span>Play Statistics</span>
                        </button>
                    </div>
                </section>
            </div>

            <div className="p-4 border-t border-slate-700 mt-auto flex-shrink-0">
                <button
                    type="button"
                    onClick={isInteractive ? onWithdrawRequest : handleStartGame}
                    disabled={isButtonDisabled}
                    className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:disabled:scale-100 hover:scale-105 ${isInteractive
                            ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                            : 'bg-green-600 hover:bg-green-500 focus:ring-green-500'
                        }`}
                >
                    {areCategoriesLoading ? 'Processing...' : (isInteractive ? 'Withdraw' : 'Play Game')}
                </button>
            </div>
        </aside>
    );
};

export default SidePanel;
