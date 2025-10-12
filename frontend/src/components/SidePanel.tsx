import React from 'react';
import { UserIcon, ChartBarIcon, QuestionMarkCircleIcon, InformationCircleIcon } from './Icons';
import { DIFFICULTY_LEVELS } from '../constants/gameConstants';
import type { Language, Difficulty, CategoryFosItem } from '../types/types';

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
}) => {
    const isInteractive = gameState === 'playing' || gameState === 'complete';
    const areSettingsDisabled = gameState === 'playing' || gameState === 'loading';
    const isButtonDisabled = gameState === 'loading' || areCategoriesLoading;

    const isCategoryDisabled = areSettingsDisabled || areCategoriesLoading || currentFos !== 'Any';
    const isFosDisabled = areSettingsDisabled || areCategoriesLoading || currentCategory !== 'Any';

    return (
        <aside className="w-full lg:h-full bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col">
            <div className="p-4 text-center border-b border-slate-700">
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
                    TUB Hints
                </h1>
            </div>

            <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                <section>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Settings</h2>
                    <div className="space-y-4">
                        {/* Language Selector */}
                        <div>
                            <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-1">Language</label>
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
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Category Selector */}
                        <div>
                            <label htmlFor="category-select" className="block text-sm font-medium text-slate-300 mb-1">Object Category</label>
                            <div className="relative">
                                <select
                                    id="category-select"
                                    value={currentCategory}
                                    onChange={(e) => onSelectCategory(e.target.value)}
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
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
                                    onChange={(e) => onSelectFos(e.target.value)}
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
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
                                            className="ml-3 block text-sm font-medium text-slate-300 disabled:opacity-50 cursor-pointer"
                                        >
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </fieldset>
                        </div>
                    </div>
                </section>
                
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
                    onClick={isInteractive ? onWithdrawRequest : onStartGame}
                    disabled={isButtonDisabled}
                    className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:disabled:scale-100 hover:scale-105 ${
                        isInteractive
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