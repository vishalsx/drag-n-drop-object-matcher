import React from 'react';
import { LANGUAGES } from '../constants/gameConstants';
import type { Difficulty } from '../types/types';
import PacManLoader from '../components/PacManLoader';

interface LoadingScreenProps {
    difficulty: Difficulty;
    selectedLanguage: string;
    selectedCategory: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ difficulty, selectedLanguage, selectedCategory }) => {
    const currentLanguageName = LANGUAGES.find(lang => lang.code === selectedLanguage)?.name || 'English';
    const categoryText = selectedCategory !== 'Any' ? ` (${selectedCategory})` : '';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4" role="dialog" aria-modal="true" aria-live="assertive">
            <div className="text-center w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
                <h2 className="text-2xl font-bold text-teal-300">Loading Game...</h2>
                <p className="mt-2 text-slate-400">
                    Preparing a <span className="font-semibold text-white">{difficulty}</span> game in <span className="font-semibold text-white">{currentLanguageName}</span>{categoryText}.
                </p>
                <div className="mt-8 flex justify-center">
                    <PacManLoader />
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;