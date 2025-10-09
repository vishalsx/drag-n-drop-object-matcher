import React, { useState, useEffect } from 'react';
import { useGame } from './hooks/useGame';
import LoadingScreen from './views/LoadingScreen';
import GameView from './views/GameView';
import CompletionScreen from './views/CompletionScreen';
import Confetti from './components/Confetti';
import ConfirmationDialog from './components/ConfirmationDialog';
import { fetchActiveLanguages } from './services/gameService';
import type { Language } from './types/types';
import { SpinnerIcon } from './components/Icons';
import AlertDialog from './components/AlertDialog';

const App: React.FC = () => {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [isAppLoading, setIsAppLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            const activeLanguages = await fetchActiveLanguages();
            setLanguages(activeLanguages);
            setIsAppLoading(false);
        };
        loadInitialData();
    }, []);

    const {
        // State from useGame hook
        score,
        shuffledDescriptions,
        shuffledImages,
        correctlyMatchedIds,
        wrongDropSourceId,
        wrongDropTargetId,
        justMatchedId,
        gameState,
        gameData,
        voteErrors,
        votingInProgress,
        sheetSaveState,
        sheetSaveError,
        selectedLanguage,
        selectedCategory,
        difficulty,
        gameStartError,

        // State Setters from useGame hook
        setSelectedLanguage,
        setSelectedCategory,
        setDifficulty,
        
        // Handlers from useGame hook
        handleDrop,
        handleMatchedImageClick,
        handleVote,
        handleSaveSheet,
        handleResetGame,
        handleStartGame,
        clearGameStartError,
    } = useGame(languages);
    
    const [isWithdrawConfirmVisible, setIsWithdrawConfirmVisible] = useState(false);

    const handleCloseCompletion = () => {
        handleResetGame();
    };

    const handleWithdrawRequest = () => {
        setIsWithdrawConfirmVisible(true);
    };

    const handleConfirmWithdraw = () => {
        handleResetGame();
        setIsWithdrawConfirmVisible(false);
    };

    const handleCancelWithdraw = () => {
        setIsWithdrawConfirmVisible(false);
    };

    const currentLanguageName = languages.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
    const currentLanguageBcp47 = languages.find(lang => lang.code === selectedLanguage)?.bcp47 || 'en-US';

    if (isAppLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center">
                <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
                <p className="text-xl text-slate-300">Loading Game Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            {gameState === 'complete' && <Confetti />}
            
            <GameView 
                score={score}
                shuffledDescriptions={shuffledDescriptions}
                shuffledImages={shuffledImages}
                correctlyMatchedIds={correctlyMatchedIds}
                wrongDropSourceId={wrongDropSourceId}
                wrongDropTargetId={wrongDropTargetId}
                justMatchedId={justMatchedId}
                handleDrop={handleDrop}
                handleMatchedImageClick={handleMatchedImageClick}
                languages={languages}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                difficulty={difficulty}
                onSelectDifficulty={setDifficulty}
                onStartGame={handleStartGame}
                onWithdrawRequest={handleWithdrawRequest}
                gameState={gameState}
            />

            {gameState === 'loading' && (
                 <LoadingScreen 
                    difficulty={difficulty}
                    selectedLanguageName={currentLanguageName}
                    selectedCategory={selectedCategory}
                />
            )}

            {gameState === 'complete' && (
                <CompletionScreen
                    score={score}
                    gameData={gameData}
                    shuffledImages={shuffledImages}
                    voteErrors={voteErrors}
                    votingInProgress={votingInProgress}
                    sheetSaveState={sheetSaveState}
                    sheetSaveError={sheetSaveError}
                    onClose={handleCloseCompletion}
                    onVote={handleVote}
                    onSaveSheet={handleSaveSheet}
                    onMatchedImageClick={handleMatchedImageClick}
                    currentLanguageBcp47={currentLanguageBcp47}
                />
            )}

            {isWithdrawConfirmVisible && (
                <ConfirmationDialog 
                    message="Are you sure you want to withdraw? Your current progress will be lost."
                    onConfirm={handleConfirmWithdraw}
                    onCancel={handleCancelWithdraw}
                />
            )}

            {gameStartError && (
                <AlertDialog
                    title="Could Not Start Game"
                    message={gameStartError}
                    onClose={clearGameStartError}
                />
            )}
        </div>
    );
};

export default App;