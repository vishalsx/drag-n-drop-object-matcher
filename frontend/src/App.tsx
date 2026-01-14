import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from './hooks/useGame';
import LoadingScreen from './views/LoadingScreen';
import GameView from './views/GameView';
import CompletionScreen from './views/CompletionScreen';
import Level2View from './views/Level2View';
import Level2CompletionScreen from './views/Level2CompletionScreen';
import GameHeader from './components/GameHeader';
import Confetti from './components/Confetti';
import ConfirmationDialog from './components/ConfirmationDialog';
import ContestTransitionModal from './components/ContestTransitionModal';
import RoundCompletionModal from './components/RoundCompletionModal';
import ContestSummaryScreen from './views/ContestSummaryScreen';
import ContestLoginScreen from './views/ContestLoginScreen';
import ContestDashboard from './views/ContestDashboard';
import ContestErrorModal from './components/ContestErrorModal';
import { SpinnerIcon } from './components/Icons.tsx';
import AlertDialog from './components/AlertDialog';
import SaveSetDialog from './components/SaveSetDialog';
import LoginScreen from './views/LoginScreen';
import { determineOrg, Organisation } from './services/routingService';

import { authService } from './services/authService';
import { contestService } from './services/contestService';

const App: React.FC = () => {
    const [isOrgChecked, setIsOrgChecked] = useState(false);

    const pathSegments = window.location.pathname.split('/').filter(Boolean).filter(segment => segment.toLowerCase() !== 'index.html');
    const [param2, setParam2] = useState<string | undefined>(pathSegments[1]);
    const [param3, setParam3] = useState<string | undefined>(pathSegments[2]);

    // Initialize contest details from localStorage, but validate it matches current URL
    const initialContestDetails = authService.getContestDetails();
    const urlContestId = param2 === 'contest' ? param3 : null;
    const cachedContestId = initialContestDetails?._id || initialContestDetails?.id;

    // Clear cached contest data if URL contest ID doesn't match cached contest ID
    const [contestDetails, setContestDetails] = useState<any>(() => {
        // Strict check: if URL does not indicate contest mode, ignore any cached details
        if (pathSegments[1] !== 'contest') {
            return null;
        }

        if (urlContestId && cachedContestId && urlContestId !== cachedContestId) {
            // Different contest - clear old data
            localStorage.removeItem('contest_details');
            localStorage.removeItem('contest_search_text');
            localStorage.removeItem('contest_error');
            return null;
        }
        return initialContestDetails;
    });

    const [orgData, setOrgData] = useState<Organisation | null>(null);

    console.log('[App] Render START', { isOrgChecked, param2, hasContest: !!contestDetails });
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
        selectedTubSheet,
        searchKeyword,

        // State Setters from useGame hook
        setSelectedLanguage,
        setDifficulty,
        setSelectedTubSheet,
        setSelectedBookId,
        setSelectedChapterId,
        setSelectedPageId,
        selectedPageId,
        setSearchKeyword,
        selectedBookTitle,
        selectedChapterName,
        selectedPageTitle,

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
        handleReplayInLanguage,
        handleLevel2QuestionDrop,
        handleLevel2NextPicture,
        handleLevel2Complete,
        handleLevel2ImageLoaded,
        currentLanguageBcp47,
        handleSpeakHint,

        stopSpeech,
        startGameWithData,
        setSelectedBookTitle,
        setSelectedChapterName,
        setSelectedPageTitle,

        // Analytics
        trackVisibilityChange,
        trackHintFlip,
        level1Timer,
        currentSegment,

        // Round Completion Modal
        showRoundCompletionModal,
        roundCompletionData,
        handleContinueToNext,
        transitionMessage
    } = useGame(isOrgChecked, param2 === 'contest', contestDetails?._id || contestDetails?.id, authService.getToken(), orgData?.org_id || null, contestDetails);

    const [isWithdrawConfirmVisible, setIsWithdrawConfirmVisible] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [contestSearchText, setContestSearchText] = useState<string | null>(null);
    const [contestError, setContestError] = useState<string | null>(null);
    const [pendingContestStart, setPendingContestStart] = useState(false);
    const [transitionNextLangCode, setTransitionNextLangCode] = useState<string | null>(null);
    const [transitionNextLangName, setTransitionNextLangName] = useState<string | null>(null);
    const [showTransitionModal, setShowTransitionModal] = useState(false);
    const [contestScores, setContestScores] = useState<{ language: string; score: number }[]>([]);

    React.useEffect(() => {
        // Check if we just completed an anonymous login (indicated by flag)
        const justLoggedInAnonymously = localStorage.getItem('skip_logout_once');

        if (justLoggedInAnonymously) {
            // Clear the flag and skip logout this time
            localStorage.removeItem('skip_logout_once');
            console.log('[App] Skipping logout - just completed anonymous login');
        } else {
            // Clear existing session on mount to treat each URL entry as a fresh request
            authService.logout();
        }

        const checkOrg = async () => {
            const pathSegments = window.location.pathname.split('/').filter(Boolean).filter(segment => segment.toLowerCase() !== 'index.html');
            const pathSegment = pathSegments[0];

            if (pathSegments.length > 1) {
                setParam2(pathSegments[1]);
            }
            if (pathSegments.length > 2) {
                setParam3(pathSegments[2]);
            }

            if (pathSegment) {
                const org = await determineOrg(pathSegment);
                console.log('Received org data:', org);
                console.log(`[App] URL check: param2=${pathSegments[1]}, param3=${pathSegments[2]}`);
                if (org) {
                    setOrgData(org);
                    if (org.org_id) {
                        authService.setOrgId(org.org_id);
                    }

                    // Handle authentication based on org type
                    if (org.org_type === 'Private' || pathSegments[1] === 'contest') {
                        setShowLogin(true);
                    } else if (org.org_type === 'Public') {
                        // For public orgs, auto-login anonymously if not already authenticated
                        const isAuthenticated = authService.isAuthenticated();
                        if (!isAuthenticated) {
                            try {
                                console.log('[App] Public org detected, attempting anonymous login...');
                                await authService.anonymousLogin(org.org_code);
                                console.log('[App] Anonymous login successful');
                                // Set flag to skip logout on next load
                                localStorage.setItem('skip_logout_once', 'true');
                                // Force a re-render after authentication
                                window.location.reload();
                            } catch (error) {
                                console.error('[App] Anonymous login failed:', error);
                                // Continue without authentication - let the app handle 401s
                            }
                        } else {
                            console.log('[App] Public org detected, user already authenticated');
                        }
                    }
                }
            } else {
                setOrgData(null);
                authService.removeOrgId();
            }
            setIsOrgChecked(true);
        };
        checkOrg();
    }, []);

    // Handle visibility changes for analytics
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (param2 === 'contest') {
                trackVisibilityChange(!document.hidden);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [param2, trackVisibilityChange]);

    // Effect to handle contest data after login or on mount
    React.useEffect(() => {
        if (param2 === 'contest' && !showLogin) {
            const details = authService.getContestDetails();
            const searchText = authService.getContestSearchText();
            const error = authService.getContestError();

            console.log('[App] Contest Data Effect:', {
                details: !!details,
                hasGameStructure: !!details?.game_structure,
                hasRoundStructure: !!(details as any)?.round_structure,
                searchText,
                error
            });

            setContestDetails(details);
            setContestSearchText(searchText);
            setContestError(error);

            if (searchText) {
                setSearchKeyword(searchText);
            }
        } else if (param2 !== 'contest') {
            setContestDetails(null);
            setContestSearchText(null);
            setContestError(null);
        }
    }, [param2, showLogin, setSearchKeyword]);

    // Contest: Default to first language and Auto-Start
    useEffect(() => {
        // Check for game_structure OR legacy round_structure before auto-starting
        const hasValidStructure = contestDetails?.game_structure || (contestDetails as any)?.round_structure;

        if (param2 === 'contest' && gameState === 'idle' && contestDetails?.supported_languages?.length > 0 && hasValidStructure && !gameStartError) {
            const firstLangName = contestDetails.supported_languages[0];

            console.log(`[Contest Auto-Start] Target: ${firstLangName}, Has Structure: ${!!hasValidStructure}`);

            if (!pendingContestStart) {
                if (firstLangName !== selectedLanguage) {
                    console.log(`[Contest Auto-Start] Setting language to ${firstLangName}`);
                    setSelectedLanguage(firstLangName);
                }
                setPendingContestStart(true);
            }
        }
    }, [contestDetails, gameState, selectedLanguage, pendingContestStart, gameStartError, setSelectedLanguage, param2]);

    // Contest: Capture intermediate scores when Round/Level 1 completes (Modal Shows)
    useEffect(() => {
        if (param2 === 'contest' && showRoundCompletionModal) {
            const currentLangName = selectedLanguage;
            console.log(`[Contest Score] Round Modal Showing. Updating score for ${currentLangName}: ${score}`);

            setContestScores(prev => {
                const exists = prev.findIndex(p => p.language === currentLangName);
                if (exists !== -1) {
                    if (prev[exists].score === score) return prev;
                    const newScores = [...prev];
                    newScores[exists] = { language: currentLangName, score: score };
                    return newScores;
                }
                return [...prev, { language: currentLangName, score: score }];
            });
        }
    }, [showRoundCompletionModal, param2, selectedLanguage, score]);

    // Contest: Capture intermediate scores when Level 2 completes
    useEffect(() => {
        if (param2 === 'contest' && gameLevel === 2 && level2State && level2State.isComplete) {
            const currentLangName = selectedLanguage;
            console.log(`[Contest Score] Level 2 Complete. Updating score for ${currentLangName}: ${level2State.score}`);

            setContestScores(prev => {
                const exists = prev.findIndex(p => p.language === currentLangName);
                if (exists !== -1) {
                    if (prev[exists].score === level2State.score) return prev;
                    const newScores = [...prev];
                    newScores[exists] = { language: currentLangName, score: level2State.score };
                    return newScores;
                }
                return [...prev, { language: currentLangName, score: level2State.score }];
            });

            // Auto-advance for contest mode (since summary screen is hidden)
            // Small delay to ensure state updates and avoid jarring transition
            const timer = setTimeout(() => {
                console.log('[Contest] Auto-advancing Level 2...');
                handleLevel2Complete();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [level2State, param2, gameLevel, selectedLanguage, handleLevel2Complete]);

    // Contest: Auto-rotation logic REMOVED.
    // useGame.ts now manages the full queue (Levels -> Rounds -> Languages).

    // Contest: Auto-submit scores when they change (real-time leaderboard)
    useEffect(() => {
        if (param2 === 'contest' && contestScores.length > 0) {
            const contestId = contestDetails?._id || contestDetails?.id;
            const username = authService.getUsername();
            if (contestId && username) {
                console.log('[App] Auto-submitting latest contest scores:', contestScores);
                contestService.submitContestScores(contestId, username, contestScores, false);
            }
        }
    }, [contestScores, param2, contestDetails]);

    const handleConfirmNextLevel = () => {
        if (transitionNextLangCode) {
            setSelectedLanguage(transitionNextLangCode);
            setPendingContestStart(true);
            setShowTransitionModal(false);
            setTransitionNextLangCode(null);
            setTransitionNextLangName(null);
        }
    };

    // Contest: Trigger start after language switch
    useEffect(() => {
        // CRITICAL: Don't start if contestDetails is null
        if (!contestDetails) {
            console.log('[Contest Start] Skipping - contestDetails is null');
            return;
        }

        if (pendingContestStart && selectedLanguage) {
            console.log('[Contest Start] Triggering handleStartGame with contestDetails:', !!contestDetails);
            handleStartGame();
            setPendingContestStart(false);
        }
    }, [selectedLanguage, pendingContestStart, handleStartGame, contestDetails]);

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

    const currentLanguageName = languages.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
    const selectedCategoryTranslated = objectCategories.find(c => c.en === selectedCategory)?.translated || selectedCategory;
    const selectedFosTranslated = fieldsOfStudy.find(f => f.en === selectedFos)?.translated || selectedFos;

    const currentContestName = useMemo(() => {
        if (!contestDetails?.name) return 'Contest';
        if (typeof contestDetails.name === 'string') return contestDetails.name;

        const nameObj = contestDetails.name;

        // 1. Try direct match with currentLanguageName (e.g. "English")
        if (currentLanguageName && nameObj[currentLanguageName]) {
            return nameObj[currentLanguageName];
        }

        // 2. Case-insensitive search of keys for currentLanguageName
        if (currentLanguageName) {
            const lowerLang = currentLanguageName.toLowerCase();
            const foundKey = Object.keys(nameObj).find(k => k.toLowerCase() === lowerLang);
            if (foundKey) return nameObj[foundKey];
        }

        // 3. Try lookup via langCode (e.g. "en")
        const langObj = languages.find(l =>
            l.name?.trim().toLowerCase() === currentLanguageName?.trim().toLowerCase() ||
            l.code?.trim().toLowerCase() === currentLanguageName?.trim().toLowerCase()
        );
        const langCode = langObj?.code?.toLowerCase();
        if (langCode && nameObj[langCode]) {
            return nameObj[langCode];
        }

        // 4. Case-insensitive search of keys for langCode
        if (langCode) {
            const foundKey = Object.keys(nameObj).find(k => k.toLowerCase() === langCode);
            if (foundKey) return nameObj[foundKey];
        }

        // 5. Fallback to English common keys
        const result = nameObj['English'] || nameObj['english'] || nameObj['en'] || nameObj['EN'] || 'Contest';
        console.log('[App] currentContestName fallback resolve:', result, { currentLanguageName, langCode, nameObj });
        return result;
    }, [contestDetails, currentLanguageName, languages]);

    if (showLogin) {
        if (param2 === 'contest') {
            if (param3) {
                return <ContestLoginScreen
                    contestId={param3}
                    contestName={currentContestName}
                    onLoginSuccess={() => {
                        const entries = authService.getContestDetails();
                        setContestDetails(entries);
                        setShowLogin(false);
                    }}
                    orgCode={orgData?.org_code}
                />;
            } else if (orgData) {
                return <ContestDashboard orgData={orgData} />;
            }
        }
        return <LoginScreen
            orgName={orgData?.org_code}
            param2={param2}
            param3={param3}
            onLoginSuccess={() => {
                setShowLogin(false);
            }}
        />;
    }

    const handleCloseCompletion = async () => {
        // For contests, submit scores and logout
        if (param2 === 'contest') {
            const contestId = contestDetails?._id || contestDetails?.id;
            const username = authService.getUsername();

            if (contestId && username && contestScores.length > 0) {
                await contestService.submitContestScores(contestId, username, contestScores, true);
            }

            authService.logout();
            const redirectUrl = orgData ? `/${orgData.org_code}/contest` : '/';
            window.location.href = redirectUrl;
        } else {
            handleResetGame();
        }
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
            {gameState === 'complete' && gameLevel === 1 && <Confetti />}

            <GameHeader
                orgData={orgData}
                gameLevel={gameLevel}
                gameState={gameState}
                username={authService.getUsername()}
                onLogout={() => {
                    authService.logout();
                    window.location.href = '/';
                }}
                contestDetails={contestDetails}
                currentLanguage={currentLanguageName}
                languages={languages}
                contestNameOverride={currentContestName}
            />

            {contestError && (
                <ContestErrorModal
                    error={contestError}
                    onExit={() => {
                        window.location.href = '/';
                    }}
                />
            )}

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
                    selectedLanguageName={currentLanguageName}
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
                    startGameWithData={startGameWithData}
                    handleSpeakHint={handleSpeakHint}
                    languageBcp47={currentLanguageBcp47}
                    trackHintFlip={trackHintFlip}
                    isContest={param2 === 'contest'}
                    orgData={orgData}
                    selectedTubSheet={selectedTubSheet}
                    onSelectTubSheet={setSelectedTubSheet}
                    searchKeyword={searchKeyword}
                    onSearchKeywordChange={setSearchKeyword}
                    onSelectBookId={setSelectedBookId}
                    onSelectChapterId={setSelectedChapterId}
                    onSelectPageId={setSelectedPageId}
                    onSelectBookTitle={setSelectedBookTitle}
                    onSelectChapterName={setSelectedChapterName}
                    onSelectPageTitle={setSelectedPageTitle}
                    selectedPageId={selectedPageId}
                    selectedBookTitle={selectedBookTitle}
                    selectedChapterName={selectedChapterName}
                    selectedPageTitle={selectedPageTitle}
                    userId={authService.getUsername()}
                    contestDetails={contestDetails}
                    contestError={contestError}
                    contestSearchText={contestSearchText}
                    level1Timer={level1Timer}
                    currentSegment={currentSegment}
                    transitionMessage={transitionMessage}
                />
            )}

            {gameState === 'loading' && gameLevel !== 1 && (
                <LoadingScreen
                    difficulty={difficulty}
                    selectedLanguageName={currentLanguageName}
                    selectedCategory={selectedCategoryTranslated}
                    selectedFos={selectedFosTranslated}
                    customMessage={transitionMessage}
                />
            )}

            {showTransitionModal && (
                <ContestTransitionModal
                    currentLanguage={currentLanguageName}
                    nextLanguage={transitionNextLangName || 'Next Language'}
                    onConfirm={handleConfirmNextLevel}
                    onCancel={() => {
                        // Optional: Allow viewing summary? Or force exit? user said "Do not display summary".
                        // Logic: If cancel, maybe just close modal and show summary (fallback)?
                        // Or logout? "Back" -> show summary.
                        setShowTransitionModal(false);
                    }}
                />
            )}

            {showRoundCompletionModal && roundCompletionData && (
                <RoundCompletionModal
                    levelName={roundCompletionData.levelName}
                    roundName={roundCompletionData.roundName}
                    language={roundCompletionData.language}
                    score={roundCompletionData.score}
                    timeElapsed={roundCompletionData.timeElapsed}
                    onContinue={handleContinueToNext}
                />
            )}

            {/* 
              Global Contest Completion - Final Summary 
              Prioritize this over level-specific screens when the entire contest is done.
            */}
            {param2 === 'contest' && gameState === 'complete' && (
                <ContestSummaryScreen
                    contestScores={contestScores}
                    contestName={currentContestName}
                    contestId={contestDetails?._id || contestDetails?.id}
                    onClose={handleCloseCompletion}
                    nextLanguageName={transitionNextLangName}
                    onNextRound={handleConfirmNextLevel}
                />
            )}

            {/* Level 1 (Non-Contest) Completion */}
            {gameLevel === 1 && gameState === 'complete' && param2 !== 'contest' && !showTransitionModal && (
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
                    isFromTubSheet={!!selectedTubSheet}
                    isFromPlaylist={!!selectedPageId}
                    isLoggedIn={!!authService.getUsername()}
                    isPublicOrg={orgData?.org_type === 'Public'}
                    availableLanguages={languages}
                    onReplayInLanguage={handleReplayInLanguage}
                    currentLanguageName={currentLanguageName}
                />
            )}

            {gameLevel === 2 && (gameState === 'playing' || gameState === 'complete') && level2State && !level2State.isComplete && (
                <Level2View
                    pictureData={level2State.pictures[level2State.currentPictureIndex]}
                    score={level2State.score}
                    elapsedTime={level2Timer}
                    onQuestionDrop={handleLevel2QuestionDrop}
                    onPictureComplete={handleLevel2NextPicture}
                    onSpeakHint={handleSpeakHint}
                    onImageLoaded={handleLevel2ImageLoaded}

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
                    searchKeyword={searchKeyword}
                    onSearchKeywordChange={setSearchKeyword}
                    onSelectBookId={setSelectedBookId}
                    onSelectChapterId={setSelectedChapterId}
                    onSelectPageId={setSelectedPageId}
                    onSelectBookTitle={setSelectedBookTitle}
                    onSelectChapterName={setSelectedChapterName}
                    onSelectPageTitle={setSelectedPageTitle}
                    selectedPageId={selectedPageId}
                    userId={authService.getUsername()}
                    orgData={orgData}
                    isContest={param2 === 'contest'}
                />
            )}

            {/* 
              Level 2 Completion Screen
              - For Standard Game: Shows when gameState is 'complete'.
              - For Contest: Shows when level2State is complete (even if gameState is 'playing'), 
                BUT hides when gameState becomes 'complete' (to let ContestSummaryScreen take over).
            */}
            {gameLevel === 2 && level2State && level2State.isComplete && param2 !== 'contest' && (
                <Level2CompletionScreen
                    pictures={level2State.pictures}
                    finalScore={level2State.score}
                    totalTime={level2Timer}
                    onClose={handleLevel2Complete}
                    onSpeakHint={handleSpeakHint}
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