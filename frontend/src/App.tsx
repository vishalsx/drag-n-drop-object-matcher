import React, { useState } from 'react';
import { useGame } from './hooks/useGame';
import LoadingScreen from './views/LoadingScreen';
import GameView from './views/GameView';
import CompletionScreen from './views/CompletionScreen';
import Confetti from './components/Confetti';
import ConfirmationDialog from './components/ConfirmationDialog';

const App: React.FC = () => {
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
    } = useGame();
    
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
                    selectedLanguage={selectedLanguage}
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
                />
            )}

            {isWithdrawConfirmVisible && (
                <ConfirmationDialog 
                    message="Are you sure you want to withdraw? Your current progress will be lost."
                    onConfirm={handleConfirmWithdraw}
                    onCancel={handleCancelWithdraw}
                />
            )}
        </div>
    );
};

export default App;