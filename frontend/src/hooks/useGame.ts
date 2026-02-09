import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameObject, Difficulty, Language, CategoryFosItem } from '../types/types';
import type { Level2GameState, Level2PictureData } from '../types/level2Types';
import type { Contest, GameStructure, LevelStructure, RoundStructure } from '../types/contestTypes';
import { fetchGameData, uploadScore, voteOnImage, saveTranslationSet, fetchCategoriesAndFos, fetchActiveLanguages, fetchContestLevelContent } from '../services/gameService';
import { contestService } from '../services/contestService';
import { useContestAnalytics } from './useContestAnalytics';
import { RoundStatus } from '../types/analyticsTypes';
import { authService } from '../services/authService';
import { shuffleArray } from '../utils/arrayUtils';
import { difficultyCounts } from '../constants/gameConstants';
import useSoundEffects from './useSoundEffects';
import { useSpeech } from './useSpeech';
import { generateLevel2Questions } from '../utils/level2MockData';

type GameState = 'idle' | 'loading' | 'playing' | 'complete';
type GameLevel = 1 | 2;

interface GameSegment {
    level: LevelStructure;
    round: RoundStructure;
    language: string;
}

const ANY_OPTION: CategoryFosItem = { en: 'Any', translated: 'Any' };

export const useGame = (
    isOrgChecked: boolean = false,
    isContest: boolean = false,
    contestId: string | null = null,
    authToken: string | null = null,
    explicitOrgId: string | null = null,
    contestDetails: Contest | null = null,
    isPublicOrg: boolean = false
) => {
    console.log(`[useGame] Init: isContest=${isContest}, contestId=${contestId}, hasToken=${!!authToken}, isPublicOrg=${isPublicOrg}`);
    const [languages, setLanguages] = useState<Language[]>([]);
    const languagesRef = useRef<Language[]>([]); // Ref to capture languages state for synchronous access
    const isLanguagesLoadedRef = useRef(false); // Synchronous flag for language availability
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [gameData, setGameData] = useState<GameObject[]>([]);
    const [shuffledDescriptions, setShuffledDescriptions] = useState<GameObject[]>([]);
    const [shuffledImages, setShuffledImages] = useState<GameObject[]>([]);
    const [correctlyMatchedIds, setCorrectlyMatchedIds] = useState<Set<string>>(new Set());
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [wrongDropTargetId, setWrongDropTargetId] = useState<string | null>(null);
    const [wrongDropSourceId, setWrongDropSourceId] = useState<string | null>(null);
    const [justMatchedId, setJustMatchedId] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguageState] = useState<string>(() => {
        return localStorage.getItem('last_selected_language') || 'en';
    });

    const setSelectedLanguage = useCallback((langOrCode: string) => {
        // We want to store the CODE. Let's try to map it.
        // If languages are not yet loaded, we might just store it.
        // But the dropdown and most interactions pass codes.
        setSelectedLanguageState(prevState => {
            let code = langOrCode;
            // Best effort mapping if languages are available and we suspect a name was passed
            if (languages.length > 0) {
                const found = languages.find(l =>
                    l.code.toLowerCase() === langOrCode.toLowerCase() ||
                    l.name.toLowerCase() === langOrCode.toLowerCase()
                );
                if (found) code = found.code;
            }
            localStorage.setItem('last_selected_language', code);
            return code;
        });
    }, [languages]);

    const [selectedCategory, setSelectedCategory] = useState<string>('Any');
    const [selectedTubSheet, setSelectedTubSheet] = useState<string>('');
    const [selectedFos, setSelectedFos] = useState<string>('Any');
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedBookTitle, setSelectedBookTitle] = useState<string>('');
    const [selectedChapterName, setSelectedChapterName] = useState<string>('');
    const [selectedPageTitle, setSelectedPageTitle] = useState<string>('');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [objectCategories, setObjectCategories] = useState<CategoryFosItem[]>([ANY_OPTION]);
    const [fieldsOfStudy, setFieldsOfStudy] = useState<CategoryFosItem[]>([ANY_OPTION]);
    const [areCategoriesLoading, setAreCategoriesLoading] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});
    const [sheetSaveState, setSheetSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [sheetSaveError, setSheetSaveError] = useState<string | null>(null);
    const [votingInProgress, setVotingInProgress] = useState<Set<string>>(new Set());
    const [gameStartError, setGameStartError] = useState<string | null>(null);
    const [isSaveSetDialogVisible, setIsSaveSetDialogVisible] = useState(false);

    // Level 2 states
    const [gameLevel, setGameLevel] = useState<GameLevel>(1);
    const [level2State, setLevel2State] = useState<Level2GameState | null>(null);
    const [level2Timer, setLevel2Timer] = useState(0);
    const [isLevel2Paused, setIsLevel2Paused] = useState(true);

    // Contest State
    const [segmentQueue, setSegmentQueueState] = useState<GameSegment[]>([]);
    const segmentQueueRef = useRef<GameSegment[]>([]);

    // Sync ref with state
    const setSegmentQueue = (queue: GameSegment[]) => {
        segmentQueueRef.current = queue;
        setSegmentQueueState(queue);
    };

    const [currentSegment, setCurrentSegment] = useState<GameSegment | null>(null);
    const [level1Objects, setLevel1Objects] = useState<GameObject[]>([]);
    const [level1Timer, setLevel1Timer] = useState(0);

    // Learners mode timer (increments from 0) and penalty tracking
    const [learnersTimer, setLearnersTimer] = useState(0);
    const learnersPenaltyMarkRef = useRef<number>(0);

    const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
    const segmentStartTimeRef = useRef<number | null>(null);
    const shouldForceRefreshRef = useRef<boolean>(true);

    // Round Completion Modal State
    const [showRoundCompletionModal, setShowRoundCompletionModal] = useState(false);
    const [roundCompletionData, setRoundCompletionData] = useState<{
        levelName: string;
        roundName: string;
        levelSeq: number;
        roundSeq: number;
        language: string;
        score: number;
        baseScore: number;
        timeBonus: number;
        timeElapsed: number;
    } | null>(null);

    const { playCorrectSound, playWrongSound, playGameCompleteSound, playYaySound } = useSoundEffects();
    const { speakText, stop } = useSpeech();
    const [username, setUsername] = useState<string | null>(null);
    const resumeAttemptsLeftRef = useRef<number | null>(null);
    const processingSegmentCompleteRef = useRef<boolean>(false);
    const isTransitioningRef = useRef<boolean>(false);


    const currentLanguageBcp47 = useMemo(() => {
        // In contest mode, use the segment language directly - backend TTS will normalize it
        if (isContest && currentSegment) {
            console.log(`[useGame] currentLanguageBcp47: Contest mode - using segment language: '${currentSegment.language}'`);
            return currentSegment.language;
        }

        // In learners mode, try to get BCP-47 from languages array
        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === (selectedLanguage || '').toLowerCase() ||
            l.name.toLowerCase() === (selectedLanguage || '').toLowerCase()
        );

        const resolved = currentLangObj?.bcp47 || selectedLanguage || 'en-US';
        console.log(`[useGame] currentLanguageBcp47: Learners mode - resolved to '${resolved}'`);
        return resolved;
    }, [selectedLanguage, languages, isContest, currentSegment]);

    // Language name for TTS - in contest mode, use segment language name directly
    const currentLanguageName = useMemo(() => {
        if (isContest && currentSegment) {
            return currentSegment.language; // e.g., "Hindi", "Bengali"
        }
        // In learners mode, try to get the name from the languages array
        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === (selectedLanguage || '').toLowerCase() ||
            l.name.toLowerCase() === (selectedLanguage || '').toLowerCase()
        );
        return currentLangObj?.name || selectedLanguage;
    }, [selectedLanguage, languages, isContest, currentSegment]);

    const objectIds = useMemo(() => gameData.map(d => d.id), [gameData]);

    // Initialize Analytics tracking
    const {
        startRound,
        trackHintFlip,
        trackWrongMatch,
        trackMatch,
        trackVisibilityChange,
        submitAnalytics
    } = useContestAnalytics({
        contestId,
        userId: authService.getUsername(), // Get directly from storage to avoid state sync lag
        languageName: currentLanguageName,
        objectIds,
        authToken
    });

    const scoreAtRoundStartRef = useRef<number>(0);
    const scoreRef = useRef<number>(score);

    // Keep scoreRef in sync with score state without causing re-renders
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    const completionTriggeredRef = useRef<boolean>(false);

    const [resumeNotificationData, setResumeNotificationData] = useState<{
        level: number;
        round: number;
        score: number;
        attemptsLeft: number;
        previousScores?: any[];
    } | null>(null);

    // Get the token to trigger re-fetch when it changes (e.g. after login)
    const token = authService.getToken();
    const orgId = authService.getOrgId();

    // Effect to load languages once on mount and set the initial language
    useEffect(() => {
        // Initialize username regardless of mode
        const uname = authService.getUsername();
        if (uname) setUsername(uname);

        if (!isOrgChecked) {
            return;
        }

        const loadInitialData = async () => {
            try {
                const effectiveOrgId = explicitOrgId || orgId;
                let activeLanguages = await fetchActiveLanguages(effectiveOrgId);

                // Filter languages for global users in the base area (no org context)
                // Skip this filtering for public orgs - they should show all org languages
                if (!effectiveOrgId && !isPublicOrg && authService.isAuthenticated()) {
                    const allowedLangs = authService.getLanguagesAllowed();
                    console.log("[useGame] Global context detected. Allowed languages from authService:", allowedLangs);

                    if (allowedLangs && allowedLangs.length > 0) {
                        activeLanguages = activeLanguages.filter(lang => {
                            const isMatch = allowedLangs.some(al => {
                                // Support both string array and object array formats
                                const alStr = typeof al === 'string' ? al : (al as any).name || (al as any).code;
                                if (!alStr) return false;

                                return alStr.toLowerCase() === lang.name.toLowerCase() ||
                                    alStr.toLowerCase() === lang.code.toLowerCase();
                            });
                            return isMatch;
                        });
                        console.log("[useGame] Filtered active languages:", activeLanguages.map(l => l.name));
                    } else {
                        console.warn("[useGame] User authenticated but no allowed languages found in localStorage.");
                    }
                } else if (isPublicOrg) {
                    console.log("[useGame] Public org detected. Showing all org languages without user-based filtering.");
                }

                setLanguages(activeLanguages);
                languagesRef.current = activeLanguages;
                isLanguagesLoadedRef.current = true;

                if (activeLanguages.length > 0) {
                    // Check if current/persisted language is still valid for this context
                    const isCurrentValid = activeLanguages.some(lang => lang.code === selectedLanguage);

                    if (!isCurrentValid) {
                        const englishLang = activeLanguages.find(lang =>
                            lang.code.toLowerCase() === 'en' ||
                            lang.name.toLowerCase() === 'english'
                        );
                        if (englishLang) {
                            setSelectedLanguage(englishLang.code);
                        } else {
                            setSelectedLanguage(activeLanguages[0].code);
                        }
                    }
                }

                if (activeLanguages.length === 0 || isContest) {
                    setIsAppLoading(false);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
                setGameStartError(error instanceof Error ? error.message : "Failed to load game data");
                setIsAppLoading(false);
            }
        };

        loadInitialData();
    }, [token, orgId, isOrgChecked, isContest]);

    useEffect(() => {
        if (token) {
            console.log("[useGame] Token detected (login/refresh). Marking for categories refresh.");
            shouldForceRefreshRef.current = true;
        }
    }, [token]);

    // Reset contest-specific state when switching contests, users, or logging into a new one
    useEffect(() => {
        if (isContest) {
            console.log(`[DEBUG-useGame] Resetting contest state for contestId: ${contestId}. Previous gameState: ${gameState}`);
            setGameState('idle');
            setScore(0);
            setGameData([]);
            setShuffledDescriptions([]);
            setShuffledImages([]);
            setSegmentQueue([]);
            setCurrentSegment(null);
            setShowRoundCompletionModal(false);
            setRoundCompletionData(null);
            setCorrectlyMatchedIds(new Set());
            setGameLevel(1);
            setLevel2State(null);
            setResumeNotificationData(null);
            resumeAttemptsLeftRef.current = null;
            scoreAtRoundStartRef.current = 0;
            setGameStartError(null);
        }
    }, [contestId, isContest, authToken]);

    // Effect to load categories whenever the language changes. This is the single source of truth.
    useEffect(() => {
        // Don't run if the language isn't set, or if we don't have the language list yet to find the language name.
        if (!selectedLanguage || isContest || (languages.length === 0 && !isContest)) {
            return;
        }

        const loadCategories = async () => {
            setAreCategoriesLoading(true);
            // Reset selections immediately to avoid mismatched states
            setSelectedCategory('Any');
            setSelectedFos('Any');
            setSelectedTubSheet('');
            setSearchKeyword('');
            setSelectedBookId(null);
            setSelectedChapterId(null);
            setSelectedPageId(null);
            setSelectedBookTitle('');
            setSelectedChapterName('');
            setSelectedPageTitle('');

            const currentLangObj = languages.find(l =>
                l.code.toLowerCase() === selectedLanguage.toLowerCase() ||
                l.name.toLowerCase() === selectedLanguage.toLowerCase()
            );
            const languageName = currentLangObj?.name || selectedLanguage;
            const effectiveOrgId = explicitOrgId || orgId;

            const refresh = shouldForceRefreshRef.current;
            const data = await fetchCategoriesAndFos(languageName, effectiveOrgId, refresh);

            if (refresh) {
                console.log("[useGame] Categories refresh completed. Resetting force refresh flag.");
                shouldForceRefreshRef.current = false;
            }

            setObjectCategories([ANY_OPTION, ...data.object_categories]);
            setFieldsOfStudy([ANY_OPTION, ...data.fields_of_study]);
            setAreCategoriesLoading(false);

            // This signals that the initial load is complete
            if (isAppLoading) {
                setIsAppLoading(false);
            }
        };

        loadCategories();
    }, [selectedLanguage, languages]);

    // Timer Effect for Level 1 Matching
    useEffect(() => {
        // Don't run timer if modal is showing, transitioning, or completion already triggered
        if (showRoundCompletionModal || isTransitioningRef.current || completionTriggeredRef.current) {
            return;
        }

        if (gameState === 'playing' && gameLevel === 1 && isContest) {
            const timer = setInterval(() => {
                setLevel1Timer(prev => {
                    if (prev <= 0) {
                        clearInterval(timer);
                        console.log('[useGame] ⏰ Timer expired!', { isTransitioning: isTransitioningRef.current, completionTriggered: completionTriggeredRef.current });

                        // Prevent double triggering if a round completion is already pending or transitioning
                        if (isTransitioningRef.current || completionTriggeredRef.current) {
                            console.log('[useGame] Timer expired but transition or completion already triggered. Ignoring.');
                            return prev; // Return prev instead of 0 to avoid leaking 0 to next round
                        }

                        completionTriggeredRef.current = true; // Set flag to prevent match completion from firing too

                        if (currentSegment) {
                            setRoundCompletionData({
                                levelName: currentSegment.level.level_name,
                                roundName: currentSegment.round.round_name,
                                levelSeq: currentSegment.level.level_seq,
                                roundSeq: currentSegment.round.round_seq,
                                language: currentSegment.language,
                                score: score,
                                baseScore: scoreAtRoundStartRef.current,
                                timeBonus: 0,
                                timeElapsed: currentSegment.round.time_limit_seconds
                            });
                            // Ensure final round score is captured
                            setScore(score);
                            setShowRoundCompletionModal(true);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState, gameLevel, isContest, showRoundCompletionModal, currentSegment, score]);

    // Timer Effect for Learners Mode (Non-Contest) - Increments and applies penalty every 10 seconds
    useEffect(() => {
        // Only run for non-contest (learners) mode, when playing matching game
        if (gameState === 'playing' && gameLevel === 1 && !isContest) {
            const timer = setInterval(() => {
                setLearnersTimer(prev => {
                    const newTime = prev + 1;

                    // Check if we've crossed a 10-second mark from the last penalty
                    // Apply penalty every 10 seconds (at 10, 20, 30, etc.)
                    if (newTime > 0 && newTime % 10 === 0 && newTime > learnersPenaltyMarkRef.current) {
                        learnersPenaltyMarkRef.current = newTime;
                        console.log(`[useGame] ⏱️ Learners mode: 10 seconds elapsed (total: ${newTime}s). Applying -5 penalty.`);
                        setScore(prevScore => prevScore - 5);
                    }

                    return newTime;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState, gameLevel, isContest]);

    // Reset learners timer when game starts or resets (non-contest mode)
    useEffect(() => {
        if (gameState === 'idle' || gameState === 'loading') {
            setLearnersTimer(0);
            learnersPenaltyMarkRef.current = 0;
        }
    }, [gameState]);

    // Helper to start a segment from queue
    const startSegment = async (segment: GameSegment, initialScore?: number) => {
        isTransitioningRef.current = true; // Still transitioning during setup
        processingSegmentCompleteRef.current = false; // Reset completion guard when segment starts
        completionTriggeredRef.current = false; // Reset completion trigger when segment starts
        setGameState('loading');

        const effectiveScore = initialScore ?? score;

        // Find language name
        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === segment.language.toLowerCase() ||
            l.name.toLowerCase() === segment.language.toLowerCase()
        );
        // If not found, use code itself
        const languageName = currentLangObj?.name || segment.language;
        setSelectedLanguage(languageName);

        console.log(`[useGame] Starting Segment: Level ${segment.level.level_seq}, Round ${segment.round.round_seq}, Lang: ${segment.language}`);

        // specific transition message
        setTransitionMessage(`Loading Level ${segment.level.level_seq} - ${segment.round.round_name || 'Round ' + segment.round.round_seq}...`);

        if (segment.level.game_type === 'matching') {
            setGameLevel(1);
            setLevel1Timer(segment.round.time_limit_seconds);
            setCorrectlyMatchedIds(new Set());
            // Do NOT reset score, accumulate it

            try {
                // Fetch data from contest-specific endpoint which has access to round structure
                const data = await fetchContestLevelContent(
                    contestId!,
                    segment.level.level_seq,
                    segment.round.round_seq,
                    languageName
                );

                if (data.length > 0) {
                    // Transform contest API response to GameObject format
                    const gameData: GameObject[] = data.map((item: any) => ({
                        id: item.translation_id,
                        objectId: item.object_id,
                        description: item.object_hint,
                        short_hint: item.object_short_hint,
                        imageUrl: `data:image/png;base64,${item.image_base64}`,
                        imageName: item.object_name,
                        object_description: item.object_description,
                        upvotes: 0,
                        downvotes: 0,
                        objectCategory: '',
                        quiz_qa: item.quiz_qa,
                        story: undefined,
                        moral: undefined
                    }));

                    setGameData(gameData);
                    setShuffledDescriptions(shuffleArray(gameData));
                    setShuffledImages(shuffleArray(gameData));

                    if (isContest) {
                        segmentStartTimeRef.current = Date.now();
                        startRound(gameData.map(d => d.id));
                    }
                    // Final confirmation that we are out of transition
                    isTransitioningRef.current = false;
                    setGameState('playing');
                    setTransitionMessage(null);
                } else {
                    console.error(`[DEBUG-useGame] No data found for segment (Level ${segment.level.level_seq}, Round ${segment.round.round_seq}, Lang ${segment.language}), skipping...`);
                    isTransitioningRef.current = false;
                    handleSegmentComplete(true); // Skip empty round?
                }
            } catch (error) {
                console.error(`[DEBUG-useGame] Error fetching segment data (Level ${segment.level.level_seq}, Round ${segment.round.round_seq}, Lang ${segment.language}):`, error);
                isTransitioningRef.current = false;
                handleSegmentComplete(false);
            }

        } else if (segment.level.game_type === 'quiz') {
            setGameLevel(2);

            try {
                // Fetch Quiz Data from Backend
                const data = await fetchContestLevelContent(
                    contestId!,
                    segment.level.level_seq,
                    segment.round.round_seq,
                    languageName // Use resolved language name
                );

                if (!data || data.length === 0) {
                    console.warn("No Level 2 data returned. Skipping.");
                    handleSegmentComplete(true);
                    return;
                }

                // Map Backend Data to Level2PictureData and filter out items without questions
                const picturesData: Level2PictureData[] = data
                    .filter((item: any) => item.questions && item.questions.length > 0)
                    .map((item: any) => {
                        // Map Questions
                        const questions: any[] = (item.questions || []).map((q: any, idx: number) => ({
                            id: `${item.object_id}_q_${idx}`, // Generate unique-ish ID
                            question: q.question,
                            answer: q.answer,
                            isCorrect: true
                        }));

                        return {
                            pictureId: item.object_id,
                            imageName: item.imageName,
                            imageUrl: item.image_base64 ? `data:image/png;base64,${item.image_base64}` : '', // Handle base64
                            questions: questions,
                            answers: shuffleArray([...questions]), // Answers are the same set, shuffled
                            matchedQuestions: new Set(),
                            wrongAttempts: 0
                        };
                    });

                setLevel2State({
                    currentPictureIndex: 0,
                    pictures: shuffleArray(picturesData),
                    score: effectiveScore, // Carry over score
                    elapsedTime: 0,
                    isComplete: false
                });

                setLevel2Timer(segment.round.time_limit_seconds);
                setIsLevel2Paused(true); // Pause until first image loads
                if (isContest) {
                    segmentStartTimeRef.current = Date.now();
                    startRound(picturesData.map(d => d.pictureId));
                    submitAnalytics(RoundStatus.STARTED, effectiveScore);
                }
                isTransitioningRef.current = false; // Reset transitioning flag
                setGameState('playing');
                setTransitionMessage(null);

            } catch (error) {
                console.error("Error starting quiz segment:", error);
                isTransitioningRef.current = false; // Reset to allow handleSegmentComplete to proceed
                handleSegmentComplete(false);
            }
        }
    };

    const handleSegmentComplete = useCallback(async (isFullTimerExpired: boolean) => {
        if (processingSegmentCompleteRef.current) {
            console.log('[DEBUG-useGame] handleSegmentComplete: Transition already in progress, ignoring.');
            return;
        }

        if (!isFullTimerExpired) {
            console.log('[DEBUG-useGame] handleSegmentComplete: Manual completion or timer expiration modal continue');
        }

        processingSegmentCompleteRef.current = true;
        isTransitioningRef.current = true; // Mark as transitioning immediately
        setGameState('loading'); // CRITICAL: Stop all timers and game logic immediately during transition
        console.log('[useGame] Segment Complete. Full Timer Expired:', isFullTimerExpired);

        // Submit analytics for this round - NON-BLOCKING
        submitAnalytics(RoundStatus.COMPLETED, score).catch(err =>
            console.error('[useGame] Analytics submission failed (background):', err)
        );

        // Log progress to backend (Resume Feature)
        if (isContest && username && currentSegment && contestId) {
            const timeUsed = currentSegment.round.time_limit_seconds - (gameLevel === 1 ? level1Timer : level2Timer);
            const incrementalScore = Math.max(0, score - scoreAtRoundStartRef.current);

            contestService.logProgress({
                contest_id: contestId,
                username: username,
                level: currentSegment.level.level_seq,
                round: currentSegment.round.round_seq,
                score: incrementalScore,
                language: currentSegment.language,
                time_taken: timeUsed
            });
        }

        // Add current round objects to level1Objects array for Level 2
        setLevel1Objects(prev => [...prev, ...gameData]);

        // Check if there are more segments using the Ref (to avoid stale closures)
        const currentQueue = segmentQueueRef.current;
        console.log('[DEBUG-useGame] handleSegmentComplete: checking queue length:', currentQueue.length);

        if (currentQueue.length > 0) {
            const nextSegment = currentQueue.shift()!;
            setSegmentQueue([...currentQueue]); // Updates both ref and state
            setCurrentSegment(nextSegment);

            console.log('[DEBUG-useGame] handleSegmentComplete: Advancing to next segment:', nextSegment);

            // Start next segment
            setCorrectlyMatchedIds(new Set());
            // Proactively reset timers to avoid bleed-through from previous round
            setLevel1Timer(nextSegment.round.time_limit_seconds);
            setLevel2Timer(nextSegment.round.time_limit_seconds);

            // Do NOT reset score in contest mode
            if (isContest) {
                // IMPORTANT: update reference score for the NEXT round only when we are officially starting it
                scoreAtRoundStartRef.current = score;
            } else {
                setScore(0);
            }

            // Start next segment
            startSegment(nextSegment, score);
        } else {
            // All segments complete
            console.log('[DEBUG-useGame] handleSegmentComplete: QUEUE EMPTY. Setting gameState to complete.');
            setGameState('complete');
            playGameCompleteSound();
        }
    }, [gameData, submitAnalytics, score, playGameCompleteSound, isContest, username, currentSegment, contestId, gameLevel, level1Timer, level2Timer]);

    // Handler for Continue button on round completion modal
    const handleContinueToNext = useCallback(() => {
        console.log('[useGame] User clicked Continue button');
        setShowRoundCompletionModal(false);
        setRoundCompletionData(null);
        handleSegmentComplete(false);
    }, [handleSegmentComplete, score]);


    const handleStartGame = useCallback(async () => {
        setGameStartError(null);
        setCorrectlyMatchedIds(new Set());
        setScore(0);
        setSheetSaveState('idle');
        setSheetSaveError(null);
        setLevel1Objects([]); // Reset accumulated objects
        scoreAtRoundStartRef.current = 0; // Initialize score tracker for round 1

        setGameState('loading');
        if (isContest) {
            console.log("[useGame] ========== CONTEST FLOW START ==========");
            console.log("[useGame] contestDetails:", JSON.stringify(contestDetails, null, 2));
            console.log("[useGame] contestDetails exists?", !!contestDetails);
            console.log("[useGame] contestDetails.game_structure exists?", !!contestDetails?.game_structure);

            // Legacy Support: Adapt round_structure to game_structure if needed
            let gameStructure = contestDetails?.game_structure;
            const legacyContestDetails = contestDetails as any;

            console.log("[useGame] gameStructure:", gameStructure);
            console.log("[useGame] legacyContestDetails.round_structure:", legacyContestDetails?.round_structure);

            if (!gameStructure && legacyContestDetails?.round_structure) {
                console.warn("[useGame] Legacy contest data detected. Adapting round_structure to game_structure.");
                gameStructure = {
                    level_count: 1,
                    levels: [{
                        level_name: "Level 1",
                        level_seq: 1,
                        game_type: "matching",
                        rounds: legacyContestDetails.round_structure
                    }]
                };
            }

            // Initialize Segment Queue
            if (!contestDetails || !gameStructure) {
                console.error("[useGame] ❌ VALIDATION FAILED!");
                console.error("[useGame] contestDetails:", contestDetails);
                console.error("[useGame] gameStructure:", gameStructure);
                setGameStartError("Invalid contest configuration.");
                setGameState('idle');
                return;
            }

            const queue: GameSegment[] = [];

            // Build queue: Level -> Round -> Language
            // User Requirement: Play all languages for a round before moving to next round.
            // gameStructure.levels -> level.rounds -> contestDetails.supported_languages

            const supportedLangs = (contestDetails.supported_languages || [selectedLanguage]).map(lang => {
                // Use languagesRef.current to map lang to name if it's a code
                const currentLangs = languagesRef.current.length > 0 ? languagesRef.current : languages;
                const found = currentLangs.find(l =>
                    l.code.toLowerCase() === lang.toLowerCase() ||
                    l.name.toLowerCase() === lang.toLowerCase()
                );
                return found?.name || lang;
            });
            console.log("[useGame] Supported languages (mapped from ref/state):", supportedLangs);

            gameStructure.levels.sort((a, b) => a.level_seq - b.level_seq).forEach(level => {
                level.rounds.sort((a, b) => a.round_seq - b.round_seq).forEach(round => {
                    supportedLangs.forEach(lang => { // Inner loop: Languages (now mapped to names)
                        queue.push({ level, round, language: lang });
                    });
                });
            });

            // RESUME LOGIC
            try {
                if (contestId) {
                    const resumeState = await contestService.enterContest(contestId);
                    console.log("[useGame] Resume State:", resumeState);

                    if (resumeState.attempts_left !== undefined) {
                        resumeAttemptsLeftRef.current = resumeState.attempts_left;
                    }

                    setResumeNotificationData({
                        level: resumeState.resume_level || 1,
                        round: resumeState.resume_round || 1,
                        score: resumeState.current_score || 0,
                        attemptsLeft: resumeState.attempts_left,
                        previousScores: resumeState.previous_scores || []
                    });

                    if (resumeState.status === "in_progress") {
                        // Restore Score
                        setScore(resumeState.current_score || 0);
                        scoreAtRoundStartRef.current = resumeState.current_score || 0;

                        // Find where to resume in the queue
                        const resumeLevel = resumeState.resume_level || 1;
                        const resumeRound = resumeState.resume_round || 1;
                        const resumeLang = resumeState.resume_language;

                        console.log(`[DEBUG-useGame] Attempting to Resume: Level ${resumeLevel}, Round ${resumeRound}, Lang ${resumeLang || 'Any'}`);

                        const resumeIndex = queue.findIndex(s =>
                            s.level.level_seq === resumeLevel &&
                            s.round.round_seq === resumeRound &&
                            (!resumeLang || s.language.toLowerCase() === resumeLang.toLowerCase())
                        );

                        if (resumeIndex > 0) {
                            console.log(`[DEBUG-useGame] Resuming... Skipping ${resumeIndex} segments.`);
                            queue.splice(0, resumeIndex);
                        } else if (resumeIndex === -1 && (resumeLevel > 1 || resumeRound > 1)) {
                            // Precise match failed, fallback to level matching
                            const levelMatchIndex = queue.findIndex(s => s.level.level_seq === resumeLevel);
                            if (levelMatchIndex >= 0) {
                                console.warn(`[DEBUG-useGame] Precise resume match failed. Falling back to Level ${resumeLevel} start.`);
                                queue.splice(0, levelMatchIndex);
                            }
                        }
                    } else if (resumeState.status === "completed") {
                        console.log("[DEBUG-useGame] SETTING GAMESTATE TO COMPLETE - Resume status is 'completed'");
                        setGameState('complete');
                        return;
                    }
                }
            } catch (err: any) {
                console.error("[useGame] Failed to load resume state:", err);
                if (err.response && (err.response.status === 403)) { // Disqualified
                    setGameStartError(err.response.data.detail || "Contest entry denied.");
                    setGameState('idle');
                    return;
                }
                setGameState('idle');
            }

            console.log("Segment Queue Built:", queue);

            if (queue.length > 0) {
                const first = queue.shift();
                if (first) {
                    setSegmentQueue(queue);
                    setCurrentSegment(first);

                    // PASS RESTORED SCORE DIRECTLY
                    // Using 0 as default if no resume state
                    const startScore = scoreAtRoundStartRef.current;
                    startSegment(first, startScore);
                }
            } else {
                setGameStartError("Empty contest structure.");
                setGameState('idle');
            }

            return; // Exit standard flow
        }

        // Standard Game Flow (Non-Contest)
        // If a page is selected (playlist), we want all images from that page (up to reasonable max),
        // ignoring the difficulty-based count which is meant for random mode.
        const count = selectedPageId ? 50 : difficultyCounts[difficulty];
        setGameState('loading');
        // ... (rest of standard logic)

        // Analytics will be started once data is fetched and gameState becomes 'playing'
        console.log(`[useGame] handleStartGame: isContest=${isContest}. Analytics will start after fetch.`);

        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === selectedLanguage.toLowerCase() ||
            l.name.toLowerCase() === selectedLanguage.toLowerCase()
        );
        const languageName = currentLangObj?.name || selectedLanguage;
        console.log(`[useGame] Starting game. Selected: ${selectedLanguage}, Resolved Name: ${languageName}`);

        // Extract orgCode from URL path segment if present
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const orgCode = pathSegments.length > 0 ? pathSegments[0] : undefined;

        const data = await fetchGameData(
            languageName,
            count,
            selectedCategory,
            selectedFos,
            selectedTubSheet || undefined,
            searchKeyword || undefined,
            selectedBookId || undefined,
            selectedChapterId || undefined,
            selectedPageId || undefined,
            orgCode
        );
        if (data.length > 0) {
            // For standard learners mode (Matching), we don't strictly require quiz questions.
            // Using all available data.
            const validData = data;

            if (validData.length > 0) {
                setGameData(validData);
                setShuffledDescriptions(shuffleArray(validData));
                setShuffledImages(shuffleArray(validData));
                setGameState('playing');

                // Start analytics tracking with the actual fetched IDs
                // Note: Standard game analytics might differ, but existing code had this:
                if (isContest) {
                    // This block is unreachable now due to early return
                    startRound(validData.map(d => d.id));
                }
            } else {
                // Should be unreachable if data.length > 0
                setGameData([]);
                setShuffledDescriptions([]);
                setShuffledImages([]);
                setGameStartError('No valid objects found. Please try different settings.');
                setGameState('idle');
            }
        } else {
            setGameData([]);
            setShuffledDescriptions([]);
            setShuffledImages([]);
            setGameStartError('No objects could be found for the selected language and category. Please try different settings.');
            setGameState('idle');
        }
    }, [selectedLanguage, difficulty, selectedCategory, selectedFos, selectedTubSheet, searchKeyword, languages, selectedBookId, selectedChapterId, selectedPageId, isContest, startRound, contestDetails]); // Added contestDetails dependency

    // Reset completion flag when gameData or correctlyMatchedIds changes

    // Reset completion flag when gameData or correctlyMatchedIds changes
    useEffect(() => {
        if (correctlyMatchedIds.size < gameData.length) {
            completionTriggeredRef.current = false;
        }
    }, [correctlyMatchedIds.size, gameData.length]);

    useEffect(() => {
        console.log('[useGame] Completion Check:', {
            gameState,
            gameDataLength: gameData.length,
            matchedCount: correctlyMatchedIds.size,
            gameLevel,
            isContest,
            allMatched: gameData.length > 0 && correctlyMatchedIds.size === gameData.length,
            completionTriggered: completionTriggeredRef.current
        });

        if (gameState === 'playing' && gameData.length > 0 && correctlyMatchedIds.size === gameData.length && gameLevel === 1 && !completionTriggeredRef.current) {
            console.log('[useGame] 🎯 ALL OBJECTS MATCHED! Waiting 1 second before showing completion...');
            completionTriggeredRef.current = true; // Set flag immediately to prevent re-trigger

            // Capture the segment for which this timeout was started
            const startingSegmentKey = currentSegment ? `${currentSegment.level.level_seq}-${currentSegment.round.round_seq}-${currentSegment.language}` : null;

            // Capture current timer value to calculate time taken
            const timeAtCompletion = level1Timer;

            // Level 1 Round Complete
            const timeout = setTimeout(() => {
                // VERIFICATION: Check if we are still on the same segment after 1 second
                const currentSegmentKey = currentSegment ? `${currentSegment.level.level_seq}-${currentSegment.round.round_seq}-${currentSegment.language}` : null;
                if (startingSegmentKey !== currentSegmentKey) {
                    console.log('[useGame] Completion timeout fired but segment already changed. Aborting.', { startingSegmentKey, currentSegmentKey });
                    return;
                }

                const currentScore = scoreRef.current; // Use ref for latest score
                console.log('[useGame] ✅ Round complete, showing modal/advancing, Final Score:', currentScore);

                if (isContest && currentSegment) {
                    const timeUsed = currentSegment.round.time_limit_seconds - level1Timer;
                    const timeLeft = Math.max(0, currentSegment.round.time_limit_seconds - timeUsed);

                    let timeBonus = 0;
                    if (contestDetails?.scoring_config?.matching) {
                        const multiplier = contestDetails.scoring_config.matching.time_bonus || 0;
                        timeBonus = timeLeft * multiplier;
                    }

                    const finalRoundScore = currentScore + timeBonus;
                    const incrementalScore = Math.max(0, finalRoundScore - scoreAtRoundStartRef.current);

                    setScore(finalRoundScore);

                    // Log progress call removed from here - consolidated into handleSegmentComplete

                    // Show modal for contest mode
                    setRoundCompletionData({
                        levelName: currentSegment.level.level_name,
                        roundName: currentSegment.round.round_name,
                        levelSeq: currentSegment.level.level_seq,
                        roundSeq: currentSegment.round.round_seq,
                        language: currentSegment.language,
                        score: finalRoundScore,
                        baseScore: currentScore,
                        timeBonus: timeBonus,
                        timeElapsed: timeUsed
                    });
                    setShowRoundCompletionModal(true);
                } else {
                    // Standard non-contest flow
                    setGameState('complete');
                    playGameCompleteSound();
                    uploadScore(currentScore);
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [gameState, gameData.length, correctlyMatchedIds.size, gameLevel, isContest, currentSegment]);

    const handleDrop = (imageId: string, descriptionId: string) => {
        if (imageId === descriptionId) {
            playCorrectSound();
            const matchedItem = gameData.find(item => item.id === imageId);
            if (matchedItem) {
                speakText(matchedItem.imageName, currentLanguageBcp47, currentLanguageName);
            }
            if (isContest) {
                trackMatch(imageId);
            }

            let pointsToAdd = 10;
            if (isContest && contestDetails?.scoring_config?.matching) {
                const config = contestDetails.scoring_config.matching;
                pointsToAdd = config.base_points;

                // Apply language weights if available
                if (config.language_weights && currentSegment) {
                    const weight = config.language_weights[currentSegment.language] || 1;
                    pointsToAdd = Math.round(pointsToAdd * weight);
                }
            }

            setScore(prevScore => prevScore + pointsToAdd);
            setCorrectlyMatchedIds(prevIds => new Set(prevIds).add(imageId));
            setJustMatchedId(imageId);
            setTimeout(() => setJustMatchedId(null), 750);
        } else {
            if (isContest) {
                trackWrongMatch(descriptionId, imageId);
            }

            let pointsToSubtract = 5;
            if (isContest && contestDetails?.scoring_config?.matching) {
                pointsToSubtract = contestDetails.scoring_config.matching.negative_marking;
            }

            setScore(prevScore => prevScore - pointsToSubtract);
            playWrongSound();
            setWrongDropTargetId(imageId);
            setWrongDropSourceId(descriptionId);
            setTimeout(() => {
                setWrongDropTargetId(null);
                setWrongDropSourceId(null);
            }, 500);
        }
    };

    const handleVote = async (translationId: string, voteType: 'up' | 'down') => {
        if (votingInProgress.has(translationId)) return;

        setVotingInProgress(prev => new Set(prev).add(translationId));
        const originalGameData = [...gameData];

        setGameData(prevData => prevData.map(item =>
            item.id === translationId
                ? { ...item, upvotes: voteType === 'up' ? item.upvotes + 1 : item.upvotes, downvotes: voteType === 'down' ? item.downvotes + 1 : item.downvotes, userVote: voteType }
                : item
        ));

        try {
            const result = await voteOnImage(translationId, voteType);
            if (result.success) {
                if (result.data) {
                    setGameData(prevData => prevData.map(item =>
                        item.id === result.data?.translation_id
                            ? { ...item, upvotes: result.data.up_votes, downvotes: result.data.down_votes }
                            : item
                    ));
                }
            } else {
                setGameData(originalGameData);
                setVoteErrors(prev => ({ ...prev, [translationId]: result.message || 'Vote failed!' }));
                setTimeout(() => setVoteErrors(prev => ({ ...prev, [translationId]: null })), 3000);
            }
        } finally {
            setVotingInProgress(prev => {
                const newSet = new Set(prev);
                newSet.delete(translationId);
                return newSet;
            });
        }
    };

    const handleSaveSheetRequest = () => {
        setIsSaveSetDialogVisible(true);
    };

    const handleCancelSaveSheet = () => {
        setIsSaveSetDialogVisible(false);
    };

    const handleConfirmSaveSheet = async (name: string) => {
        setSheetSaveState('saving');
        setSheetSaveError(null);

        const translationIds = gameData.map(item => item.id);
        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === selectedLanguage.toLowerCase() ||
            l.name.toLowerCase() === selectedLanguage.toLowerCase()
        );
        const languageName = currentLangObj?.name || selectedLanguage;
        const result = await saveTranslationSet(name, languageName, translationIds, selectedCategory);

        setIsSaveSetDialogVisible(false);

        if (result.success) {
            setSheetSaveState('success');
        } else {
            setSheetSaveState('error');
            setSheetSaveError(result.message || 'Failed to save sheet.');
            setTimeout(() => setSheetSaveState('idle'), 3000);
        }
    };

    const handleReplayInLanguage = async (newLanguage: string) => {
        console.log(`[useGame] handleReplayInLanguage: ${newLanguage}`);
        setGameState('loading');
        setTransitionMessage(`Loading ${newLanguage}...`);

        try {
            // Extract orgCode from URL path segment if present
            const pathSegments = window.location.pathname.split('/').filter(Boolean);
            const orgCode = pathSegments.length > 0 ? pathSegments[0] : undefined;

            const objectIds = gameData.map(item => item.objectId);
            const newData = await fetchGameData(
                newLanguage,
                objectIds.length,
                'Any',
                'Any',
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                orgCode,
                objectIds
            );

            if (newData.length > 0) {
                // Filter out objects without quiz questions
                const validNewData = newData.filter(item => item.quiz_qa && item.quiz_qa.length > 0);

                if (validNewData.length > 0) {
                    // Ensure the order of objects is preserved or matched correctly
                    // The backend should return the translations for the provided IDs.
                    setSelectedLanguage(newLanguage);
                    setGameData(validNewData);
                    setShuffledDescriptions(shuffleArray(validNewData));
                    setShuffledImages(shuffleArray(validNewData));
                    setCorrectlyMatchedIds(new Set());
                    setScore(0);
                    setGameState('playing');
                    setTransitionMessage(null);

                    // Track start for analytics if needed
                    if (isContest) startRound(validNewData.map(d => d.id));
                } else {
                    setGameStartError(`Could not find translations with quiz questions for ${newLanguage}`);
                    handleResetGame();
                }
            } else {
                setGameStartError(`Could not find translations for ${newLanguage}`);
                handleResetGame();
            }
        } catch (error) {
            console.error('[useGame] Failed to replay in language:', error);
            setGameStartError('Failed to load new language');
            handleResetGame();
        } finally {
            setTransitionMessage(null);
        }
    };

    const handleResetGame = () => {
        setGameState('idle');
        setGameData([]);
        setShuffledDescriptions([]);
        setShuffledImages([]);
        setCorrectlyMatchedIds(new Set());
        setScore(0);

        // Reset search fields
        setSearchKeyword('');
        setSelectedCategory('Any');
        setSelectedFos('Any');
        setSelectedTubSheet('');
        setSelectedBookId(null);
        setSelectedChapterId(null);
        setSelectedPageId(null);
        setSelectedBookTitle('');
        setSelectedChapterName('');
        setSelectedPageTitle('');

        // Reset to default or last saved language
        const lastLang = localStorage.getItem('last_selected_language') || 'en';
        setSelectedLanguageState(lastLang);

        // Reset Level 2 state
        setGameLevel(1);
        setLevel2State(null);
        setLevel2Timer(0);
    };

    const handleMatchedImageClick = (imageName: string) => {
        speakText(imageName, currentLanguageBcp47, currentLanguageName);
    };

    const clearGameStartError = useCallback(() => {
        setGameStartError(null);
    }, []);

    const handleSelectCategory = (category: string) => {
        setSelectedCategory(category);
        if (category !== 'Any') {
            setSelectedFos('Any');
        }
    };

    const handleSelectFos = (fos: string) => {
        setSelectedFos(fos);
        if (fos !== 'Any') {
            setSelectedCategory('Any');
        }
    };

    useEffect(() => {
        // Debug logging for Level 2 Timer
        if (gameLevel === 2) {
            console.log('[useGame] Level 2 Timer Check:', {
                gameLevel,
                hasLevel2State: !!level2State,
                isComplete: level2State?.isComplete,
                isPaused: isLevel2Paused,
                modalShowing: showRoundCompletionModal,
                transitioning: isTransitioningRef.current,
                completionTriggered: completionTriggeredRef.current,
                timerValue: level2Timer
            });
        }

        // Don't run timer if modal is showing, transitioning, or completion already triggered
        if (showRoundCompletionModal || isTransitioningRef.current || completionTriggeredRef.current || !level2State || level2State.isComplete || isLevel2Paused) {
            return;
        }

        if (gameLevel === 2) {
            const interval = setInterval(() => {
                setLevel2Timer(prev => {
                    if (isContest) {
                        // Contest Mode: Countdown
                        if (prev <= 0) {
                            clearInterval(interval);
                            console.log('[useGame] ⏰ Level 2 Timer expired!', { isTransitioning: isTransitioningRef.current, completionTriggered: completionTriggeredRef.current });

                            // Prevent double triggering if a round completion is already pending or transitioning
                            if (isTransitioningRef.current || completionTriggeredRef.current) {
                                console.log('[useGame] Level 2 Timer expired but transition or completion already triggered. Ignoring.');
                                return prev; // Return prev instead of 0 to avoid leaking 0 to next round
                            }

                            completionTriggeredRef.current = true; // Set flag to prevent quiz completion from firing too
                            // TODO: Handle Level 2 round expiration strictly?
                            // For now, let's auto-complete efficiently or show timeout
                            // Since we have questions, maybe we just stop? or complete?
                            // Let's rely on handleLevel2Complete logic or just let it sit at 0?
                            // Re-using logic: If timer ends, maybe we just end the round?
                            // Actually, standard practice: End round, show summary.
                            // But for now, let's just stop at 0 and let user finish?
                            // Requirement says "display remaining time".
                            // If it reaches 0, maybe we should force complete.
                            // This matches level 1 behavior.
                            // However, we need to trigger completion.
                            // Let's trigger "Picture" completion or Round.
                            // Since Level 2 might have multiple pictures, this timer is for the WHOLE round?
                            // Wait, currently startSegment sets timer from round.time_limit_seconds.
                            // So it is for the whole round (all pictures).
                            // So we should end the round.

                            // Trigger completion with current score
                            if (currentSegment) {
                                const finalRoundScore = level2State ? level2State.score : score;
                                setScore(finalRoundScore);
                                setRoundCompletionData({
                                    levelName: currentSegment.level.level_name,
                                    roundName: currentSegment.round.round_name,
                                    levelSeq: currentSegment.level.level_seq,
                                    roundSeq: currentSegment.round.round_seq,
                                    language: currentSegment.language,
                                    score: finalRoundScore,
                                    baseScore: finalRoundScore,
                                    timeBonus: 0,
                                    timeElapsed: currentSegment.round.time_limit_seconds // Full time used
                                });
                                setShowRoundCompletionModal(true);
                            }
                            return 0;
                        }
                        return prev - 1;
                    } else {
                        // Standard Mode: Count up (Elapsed Time)
                        const newTime = prev + 1;
                        // Every 10 seconds, reduce score by 5
                        if (newTime % 10 === 0 && level2State) {
                            setLevel2State(prevState => prevState ? {
                                ...prevState,
                                score: prevState.score - 5
                            } : null);
                        }
                        return newTime;
                    }
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [gameLevel, level2State?.isComplete, isContest, currentSegment, score, isLevel2Paused]);

    // Level 2 Milestone Sound Effect
    const lastMilestoneRef = useRef<number>(0);

    useEffect(() => {
        if (gameLevel !== 2 || !level2State) {
            lastMilestoneRef.current = 0;
            return;
        }

        const currentScore = level2State.score;
        const currentMilestone = Math.floor(currentScore / 50);

        if (currentMilestone > lastMilestoneRef.current) {
            playYaySound();
            lastMilestoneRef.current = currentMilestone;
        } else if (currentMilestone < lastMilestoneRef.current) {
            // Update ref if score drops below last milestone reached
            lastMilestoneRef.current = currentMilestone;
        }
    }, [level2State?.score, gameLevel, playYaySound]);

    // Level 2: Start Level 2 with data from Level 1
    const handleStartLevel2 = () => {
        if (gameData.length === 0) return;

        // Randomly shuffle the pictures from Level 1
        const shuffledPictures = shuffleArray([...gameData]);

        // Generate questions for each picture
        const pictures: Level2PictureData[] = shuffledPictures.map(pic => {
            const questions = generateLevel2Questions(pic);
            const answers = shuffleArray(questions.filter(q => q.isCorrect));

            return {
                pictureId: pic.id,
                imageName: pic.imageName,
                imageUrl: pic.imageUrl,
                questions,
                answers,
                matchedQuestions: new Set<string>(),
                wrongAttempts: 0,
            };
        });

        setLevel2State({
            currentPictureIndex: 0,
            pictures,
            score: score, // Carry over Level 1 score
            elapsedTime: 0,
            isComplete: false,
        });

        setLevel2Timer(0);
        setIsLevel2Paused(false); // Don't pause for Learners Mode - start timer immediately
        setGameLevel(2);

        // Reset completion flags
        completionTriggeredRef.current = false;
        isTransitioningRef.current = false;

        setGameState('playing');
    };

    // Level 2: Handle question drop
    const handleLevel2QuestionDrop = (questionId: string, targetAnswerId: string) => {
        if (!level2State) return;

        const currentPicture = level2State.pictures[level2State.currentPictureIndex];

        // In this game mode, a match is correct if the question ID matches the answer ID
        // (since the answers are derived from the correct questions)
        const isCorrect = questionId === targetAnswerId;

        if (isCorrect) {
            // Calculate base points with multipliers for contests
            let pointsToAdd = 15;
            if (isContest && contestDetails?.scoring_config?.quiz) {
                const qConfig = contestDetails.scoring_config.quiz;
                let base = qConfig.base_points ?? 15;

                // Language weight
                if (qConfig.language_weights && currentSegment?.language) {
                    const langWeight = qConfig.language_weights[currentSegment.language] || 1;
                    base = Math.round(base * langWeight);
                }

                // Difficulty weight (matching quiz questions might have individual difficulty)
                // For now, if currentPicture has a difficulty, use it.
                // Level 2 Pictures often come from objects that have a difficulty_level.
                pointsToAdd = base;
            }

            // Add to matched questions
            const newMatched = new Set(currentPicture.matchedQuestions);
            newMatched.add(questionId);

            const updatedPictures = [...level2State.pictures];
            updatedPictures[level2State.currentPictureIndex] = {
                ...currentPicture,
                matchedQuestions: newMatched,
            };

            const newLevel2Score = level2State.score + pointsToAdd;
            console.log(`[ScoreDebug] Legacy Quiz Correct Match: +${pointsToAdd} points. New Level Score: ${newLevel2Score}`);

            setLevel2State({
                ...level2State,
                pictures: updatedPictures,
                score: newLevel2Score,
            });

            // Pause timer if all correct questions for this picture are matched
            if (newMatched.size >= currentPicture.questions.length) {
                console.log('[useGame] All questions matched for this picture. Pausing timer for transition.');
                setIsLevel2Paused(true);
            }

            playCorrectSound();
        } else {
            // Incorrect answer
            let penalty = 10;
            if (isContest && contestDetails?.scoring_config?.quiz) {
                penalty = contestDetails.scoring_config.quiz.negative_marking || 0;
            }

            const updatedPictures = [...level2State.pictures];
            updatedPictures[level2State.currentPictureIndex] = {
                ...currentPicture,
                wrongAttempts: currentPicture.wrongAttempts + 1,
            };

            const newLevel2Score = Math.max(0, level2State.score - penalty);
            console.log(`[ScoreDebug] Legacy Quiz Wrong Match: -${penalty} points. New Level Score: ${newLevel2Score}`);

            setLevel2State({
                ...level2State,
                pictures: updatedPictures,
                score: newLevel2Score,
            });

            playWrongSound();
        }
    };

    // Level 2: Move to next picture
    const handleLevel2NextPicture = () => {
        if (!level2State) return;

        const nextIndex = level2State.currentPictureIndex + 1;

        if (nextIndex >= level2State.pictures.length) {
            // All pictures completed
            setLevel2State({
                ...level2State,
                isComplete: true,
            });

            // For contests, automatically proceed to segment completion after a brief delay
            if (isContest) {
                console.log('[useGame] Level 2 (Quiz) complete in contest mode. Proceeding...');

                // Capture the segment for which this timeout was started
                const startingSegmentKey = currentSegment ? `${currentSegment.level.level_seq}-${currentSegment.round.round_seq}-${currentSegment.language}` : null;

                setTimeout(() => {
                    // VERIFICATION: Check if we are still on the same segment after delay
                    const currentSegmentKey = currentSegment ? `${currentSegment.level.level_seq}-${currentSegment.round.round_seq}-${currentSegment.language}` : null;
                    if (startingSegmentKey !== currentSegmentKey) {
                        console.log('[useGame] Level 2 completion timeout fired but segment already changed. Aborting.', { startingSegmentKey, currentSegmentKey });
                        return;
                    }

                    handleLevel2Complete();
                }, 1500);
            }
        } else {
            // Move to next picture
            setIsLevel2Paused(isContest); // Only pause in contest mode
            setLevel2State({
                ...level2State,
                currentPictureIndex: nextIndex,
            });
        }
    };

    const handleLevel2ImageLoaded = () => {
        console.log('[useGame] Level 2 Image Loaded. Resuming timer.');
        setIsLevel2Paused(false);
    };

    // Level 2 (Quiz) Completion handler for contest mode
    const handleQuizComplete = useCallback((quizScore: number, correctCount: number, timeLeftSeconds?: number) => {
        console.log('[useGame] 🏁 Quiz Complete!', { quizScore, correctCount, timeLeftSeconds });

        if (isContest && currentSegment) {
            // Exactly matching the logic from Level 1 Matching completion
            const totalRoundTime = currentSegment.round.time_limit_seconds;
            // Use the passed timeLeft or fallback to level2Timer state
            const timeLeftAtCompletion = timeLeftSeconds !== undefined ? timeLeftSeconds : (level2Timer || 0);

            const timeUsed = totalRoundTime - timeLeftAtCompletion;
            const timeLeft = Math.max(0, totalRoundTime - timeUsed);

            let timeBonus = 0;
            const qConfig = contestDetails?.scoring_config?.quiz;
            if (qConfig) {
                const multiplier = qConfig.time_bonus || 0;
                timeBonus = Math.round(timeLeft * multiplier);
                console.log(`[useGame] Quiz Time Bonus Calc: ${timeLeft}s * ${multiplier} = ${timeBonus}`);
            }

            const totalRoundScore = quizScore + timeBonus;
            const finalScore = score + totalRoundScore;

            console.log(`[ScoreDebug] useGame.handleQuizComplete:`, {
                prevTotalScore: score,
                quizScoreEarned: quizScore,
                timeLeftValue: timeLeft,
                multiplier: qConfig?.time_bonus,
                calculatedBonus: timeBonus,
                totalRoundScore: totalRoundScore,
                finalScoreAfterUpdate: finalScore
            });

            setScore(finalScore);

            // Log progress call removed from here - consolidated into handleSegmentComplete

            setRoundCompletionData({
                levelName: currentSegment.level.level_name,
                roundName: currentSegment.round.round_name,
                levelSeq: currentSegment.level.level_seq,
                roundSeq: currentSegment.round.round_seq,
                language: currentSegment.language,
                score: finalScore,
                baseScore: score + quizScore,
                timeBonus: timeBonus,
                timeElapsed: timeUsed
            });
            setShowRoundCompletionModal(true);
        } else {
            // Standard non-contest flow
            const finalScore = score + quizScore;
            setScore(finalScore);
            handleSegmentComplete(false);
        }
    }, [score, isContest, currentSegment, level2Timer, contestDetails, handleSegmentComplete]);

    const handleLevel2Complete = useCallback(() => {
        let currentBaseScore = score;
        if (level2State) {
            currentBaseScore = level2State.score;
            setScore(currentBaseScore); // Sync score
        }

        if (isContest && currentSegment) {
            const totalRoundTime = currentSegment.round.time_limit_seconds;
            const timeUsed = totalRoundTime - level2Timer;
            const timeLeft = Math.max(0, totalRoundTime - timeUsed);

            let timeBonus = 0;
            const qConfig = contestDetails?.scoring_config?.quiz;
            if (qConfig) {
                const multiplier = qConfig.time_bonus || 0;
                timeBonus = Math.round(timeLeft * multiplier);
                console.log(`[ScoreDebug] Legacy Quiz Time Bonus Calculation: ${timeLeft}s * ${multiplier} = ${timeBonus}`);
            }

            const newTotalScore = currentBaseScore + timeBonus;

            console.log(`[ScoreDebug] Legacy Quiz Round Final: Base=${currentBaseScore}, Bonus=${timeBonus}, Total=${newTotalScore}`);

            setScore(newTotalScore);


            // Log progress call removed from here - consolidated into handleSegmentComplete

            setRoundCompletionData({
                levelName: currentSegment.level.level_name,
                roundName: currentSegment.round.round_name,
                levelSeq: currentSegment.level.level_seq,
                roundSeq: currentSegment.round.round_seq,
                language: currentSegment.language,
                score: newTotalScore,
                baseScore: currentBaseScore,
                timeBonus: timeBonus,
                timeElapsed: timeUsed
            });
            setShowRoundCompletionModal(true);
        } else if (isContest) {
            handleSegmentComplete(false);
        } else {
            handleResetGame();
        }
    }, [level2State, isContest, currentSegment, score, level2Timer, contestDetails, handleSegmentComplete, handleResetGame]);

    const startGameWithData = useCallback((data: GameObject[]) => {
        setGameState('loading');
        setGameStartError(null);
        setCorrectlyMatchedIds(new Set());
        setScore(0);
        setSheetSaveState('idle');
        setSheetSaveError(null);

        if (data.length > 0) {
            setGameData(data);
            setShuffledDescriptions(shuffleArray(data));
            setShuffledImages(shuffleArray(data));
            setGameState('playing');
        } else {
            setGameData([]);
            setShuffledDescriptions([]);
            setShuffledImages([]);
            setGameStartError('No objects found in this content.');
            setGameState('idle');
        }
    }, []);

    return {
        // State
        gameData,
        shuffledDescriptions,
        shuffledImages,
        correctlyMatchedIds,
        score,
        gameState,
        wrongDropTargetId,
        wrongDropSourceId,
        justMatchedId,
        selectedLanguage,
        selectedCategory,
        selectedFos,
        selectedBookId,
        selectedChapterId,
        selectedPageId,
        selectedBookTitle,
        selectedChapterName,
        selectedPageTitle,
        searchKeyword,
        objectCategories,
        fieldsOfStudy,
        areCategoriesLoading,
        selectedTubSheet,
        difficulty,
        voteErrors,
        sheetSaveState,
        sheetSaveError,
        votingInProgress,
        gameStartError,
        isSaveSetDialogVisible,
        languages,
        isAppLoading,

        // Level 2 State
        gameLevel,
        level2State,
        level2Timer,
        isLevel2Paused,

        // Contest State
        currentSegment,
        level1Timer,

        // Learners Mode Timer
        learnersTimer,

        currentRoundIndex: currentSegment ? (currentSegment.round.round_seq) : 0,
        totalRounds: contestDetails?.game_structure?.levels.reduce((acc, l) => acc + l.rounds.length, 0) || 0, // Approx logic

        // Round Completion Modal
        showRoundCompletionModal,
        roundCompletionData,
        handleContinueToNext,
        transitionMessage,

        // State Setters
        setSelectedLanguage,
        setDifficulty,
        setSelectedTubSheet,
        setSelectedBookId,
        setSelectedChapterId,
        setSelectedPageId,
        setSelectedBookTitle,
        setSelectedChapterName,
        setSelectedPageTitle,
        setSearchKeyword,

        // Handlers
        handleDrop,
        handleVote,
        handleSaveSheetRequest,
        handleConfirmSaveSheet,
        handleCancelSaveSheet,
        handleStartGame,
        startGameWithData,
        handleResetGame,
        clearGameStartError,
        handleStartLevel2,
        handleLevel2QuestionDrop,
        handleLevel2NextPicture,
        handleQuizComplete,
        handleLevel2Complete, // This needs to call handleSegmentComplete logic if queue not empty? Logic moved to handleSegmentComplete.
        handleLevel2ImageLoaded,
        handleReplayInLanguage,
        handleMatchedImageClick,
        handleSelectCategory,
        handleSelectFos,
        currentLanguageBcp47,
        handleSpeakHint: useCallback((text: string, pictureId?: string) => {
            speakText(text, currentLanguageBcp47, currentLanguageName);
            if (isContest && pictureId) {
                trackHintFlip(pictureId);
            }
        }, [speakText, currentLanguageBcp47, currentLanguageName, isContest, trackHintFlip]),
        stopSpeech: stop,
        setLevel2Timer,

        // Analytics
        trackVisibilityChange,
        trackHintFlip,

        // Resume Info
        attemptsLeft: resumeAttemptsLeftRef.current,
        resumeNotificationData,
        previousScores: resumeNotificationData?.previousScores || [],
        clearResumeNotification: useCallback(() => setResumeNotificationData(null), []),
        isLanguagesLoadedRef
    };
};