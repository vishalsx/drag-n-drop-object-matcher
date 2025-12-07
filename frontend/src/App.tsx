import React, { useState } from 'react';
import { useGame } from './hooks/useGame';
import LoadingScreen from './views/LoadingScreen';
import GameView from './views/GameView';
import CompletionScreen from './views/CompletionScreen';
import Level2View from './views/Level2View';
import Level2CompletionScreen from './views/Level2CompletionScreen';
import GameHeader from './components/GameHeader';
import Confetti from './components/Confetti';
import ConfirmationDialog from './components/ConfirmationDialog';
import { SpinnerIcon } from './components/Icons';
import AlertDialog from './components/AlertDialog';
import SaveSetDialog from './components/SaveSetDialog';
import LoginScreen from './views/LoginScreen';
import { determineOrg, Organisation } from './services/routingService';

import { authService } from './services/authService';

const App: React.FC = () => {
    const [isOrgChecked, setIsOrgChecked] = useState(false);

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
        selectedFos,
        objectCategories,
        fieldsOfStudy,
        areCategoriesLoading,
        difficulty,
        gameStartError,
        isSaveSetDialogVisible,
        languages,
        isAppLoading,
        gameLevel,
        level2State,
        level2Timer,

        // State Setters from useGame hook
        setSelectedLanguage,
        setDifficulty,

        // Handlers from useGame hook
        handleDrop,
        handleMatchedImageClick,
        handleVote,
        handleSaveSheetRequest,
        handleConfirmSaveSheet,
        handleCancelSaveSheet,
        handleResetGame,
        handleStartGame,
        clearGameStartError,
        handleSelectCategory,
        handleSelectFos,
        handleStartLevel2,
        handleLevel2QuestionDrop,
        handleLevel2NextPicture,
        handleLevel2Complete,
        currentLanguageBcp47,
        handleSpeakHint,
        stopSpeech,
    } = useGame(isOrgChecked);

    const [isWithdrawConfirmVisible, setIsWithdrawConfirmVisible] = useState(false);
    const [orgData, setOrgData] = useState<Organisation | null>(null);
    const [showLogin, setShowLogin] = useState(false);

    React.useEffect(() => {
        // Clear existing session on mount to treat as a fresh request
        authService.logout();

        const checkOrg = async () => {
            const pathSegment = window.location.pathname.split('/')[1];
            if (pathSegment) {
                const org = await determineOrg(pathSegment);
                console.log('Received org data:', org);
                if (org) {
                    setOrgData(org);
                    if (org.org_id) {
                        authService.setOrgId(org.org_id);
                    }
                    if (org.org_type === 'Private') {
                        setShowLogin(true);
                    }
                }
            }
            setIsOrgChecked(true);
        };
        checkOrg();
    }, []);

    // Stop speech when window loses focus or is closed
    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopSpeech();
            }
        };

        const handleWindowBlur = () => {
            stopSpeech();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('beforeunload', stopSpeech);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('beforeunload', stopSpeech);
        };
    }, [stopSpeech]);

    if (showLogin) {
        return <LoginScreen orgName={orgData?.org_code} onLoginSuccess={() => setShowLogin(false)} />;
    }

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

    const selectedCategoryTranslated = objectCategories.find(c => c.en === selectedCategory)?.translated || selectedCategory;
    const selectedFosTranslated = fieldsOfStudy.find(f => f.en === selectedFos)?.translated || selectedFos;

    const onSpeakHint = (text: string) => {
        handleSpeakHint(text, currentLanguageBcp47);
    };

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
            {gameState === 'complete' && gameLevel === 1 && <Confetti />}

            <GameHeader orgData={orgData} gameLevel={gameLevel} />

            {gameLevel === 1 && (
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
                    onSelectCategory={handleSelectCategory}
                    selectedFos={selectedFos}
                    onSelectFos={handleSelectFos}
                    objectCategories={objectCategories}
                    fieldsOfStudy={fieldsOfStudy}
                    areCategoriesLoading={areCategoriesLoading}
                    difficulty={difficulty}
                    onSelectDifficulty={setDifficulty}
                    onStartGame={handleStartGame}
                    onWithdrawRequest={handleWithdrawRequest}
                    gameState={gameState}
                    handleSpeakHint={onSpeakHint}
                    languageBcp47={currentLanguageBcp47}
                    orgData={orgData}
                />
            )}

            {gameState === 'loading' && (
                <LoadingScreen
                    difficulty={difficulty}
                    selectedLanguageName={currentLanguageName}
                    selectedCategory={selectedCategoryTranslated}
                    selectedFos={selectedFosTranslated}
                />
            )}

            {gameLevel === 1 && gameState === 'complete' && (
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
                    onSaveSheet={handleSaveSheetRequest}
                    onMatchedImageClick={handleMatchedImageClick}
                    currentLanguageBcp47={currentLanguageBcp47}
                    onLevel2={handleStartLevel2}
                />
            )}

            {gameLevel === 2 && (gameState === 'playing' || gameState === 'complete') && level2State && !level2State.isComplete && (
                <Level2View
                    pictureData={level2State.pictures[level2State.currentPictureIndex]}
                    score={level2State.score}
                    elapsedTime={level2Timer}
                    onQuestionDrop={handleLevel2QuestionDrop}
                    onPictureComplete={handleLevel2NextPicture}
                    onSpeakHint={onSpeakHint}

                    // SidePanel Props
                    languages={languages}
                    selectedLanguage={selectedLanguage}
                    onSelectLanguage={setSelectedLanguage}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                    selectedFos={selectedFos}
                    onSelectFos={handleSelectFos}
                    objectCategories={objectCategories}
                    fieldsOfStudy={fieldsOfStudy}
                    areCategoriesLoading={areCategoriesLoading}
                    difficulty={difficulty}
                    onSelectDifficulty={setDifficulty}
                    onStartGame={handleStartGame}
                    onWithdrawRequest={handleWithdrawRequest}
                    gameState={gameState}
                />
            )}

            {gameState === 'complete' && gameLevel === 2 && level2State && level2State.isComplete && (
                <Level2CompletionScreen
                    pictures={level2State.pictures}
                    finalScore={level2State.score}
                    totalTime={level2Timer}
                    onClose={handleLevel2Complete}
                    onSpeakHint={onSpeakHint}
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

            {isSaveSetDialogVisible && (
                <SaveSetDialog
                    isOpen={isSaveSetDialogVisible}
                    isSaving={sheetSaveState === 'saving'}
                    onSave={handleConfirmSaveSheet}
                    onCancel={handleCancelSaveSheet}
                />
            )}
        </div>
    );
};

export default App;