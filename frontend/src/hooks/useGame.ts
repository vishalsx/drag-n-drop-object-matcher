import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameObject, Difficulty, Language, CategoryFosItem } from '../types/types';
import type { Level2GameState, Level2PictureData } from '../types/level2Types';
import type { Contest, GameStructure, LevelStructure, RoundStructure } from '../types/contestTypes';
import { fetchGameData, uploadScore, voteOnImage, saveTranslationSet, fetchCategoriesAndFos, fetchActiveLanguages, fetchContestLevelContent } from '../services/gameService';
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
    contestDetails: Contest | null = null
) => {
    console.log(`[useGame] Init: isContest=${isContest}, contestId=${contestId}, hasToken=${!!authToken}`);
    const [languages, setLanguages] = useState<Language[]>([]);
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
    const [segmentQueue, setSegmentQueue] = useState<GameSegment[]>([]);
    const [currentSegment, setCurrentSegment] = useState<GameSegment | null>(null);
    const [level1Objects, setLevel1Objects] = useState<GameObject[]>([]);
    const [level1Timer, setLevel1Timer] = useState(0);
    const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
    const segmentStartTimeRef = useRef<number | null>(null);
    const shouldForceRefreshRef = useRef<boolean>(true);

    // Round Completion Modal State
    const [showRoundCompletionModal, setShowRoundCompletionModal] = useState(false);
    const [roundCompletionData, setRoundCompletionData] = useState<{
        levelName: string;
        roundName: string;
        language: string;
        score: number;
        timeElapsed: number;
    } | null>(null);

    const { playCorrectSound, playWrongSound, playGameCompleteSound, playYaySound } = useSoundEffects();
    const { speakText, stop } = useSpeech();
    const [username, setUsername] = useState<string | null>(null);

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
        languageName: selectedLanguage,
        objectIds,
        authToken
    });

    // Get the token to trigger re-fetch when it changes (e.g. after login)
    const token = authService.getToken();
    const orgId = authService.getOrgId();

    // Effect to load languages once on mount and set the initial language
    useEffect(() => {
        // Initialize username regardless of mode
        const uname = authService.getUsername();
        if (uname) setUsername(uname);

        if (!isOrgChecked || isContest) {
            if (isContest) setIsAppLoading(false);
            return;
        }

        const loadInitialData = async () => {
            try {
                const effectiveOrgId = explicitOrgId || orgId;
                const activeLanguages = await fetchActiveLanguages(effectiveOrgId);
                setLanguages(activeLanguages);

                if (activeLanguages.length > 0) {
                    // Check if current/persisted language is still valid for this org
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
                } else {
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

    // Track token changes to force a refresh on login
    useEffect(() => {
        if (token) {
            console.log("[useGame] Token detected (login/refresh). Marking for categories refresh.");
            shouldForceRefreshRef.current = true;
        }
    }, [token]);

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
        // Don't run timer if modal is showing
        if (showRoundCompletionModal) {
            return;
        }

        if (gameState === 'playing' && gameLevel === 1 && isContest) {
            const timer = setInterval(() => {
                setLevel1Timer(prev => {
                    if (prev <= 0) {
                        clearInterval(timer);
                        // Timer expired - show modal with time's up status
                        console.log('[useGame] ⏰ Timer expired!');
                        if (currentSegment) {
                            setRoundCompletionData({
                                levelName: currentSegment.level.level_name,
                                roundName: currentSegment.round.round_name,
                                language: currentSegment.language,
                                score: score,
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

    // Helper to start a segment from queue
    const startSegment = async (segment: GameSegment) => {
        setGameState('loading');

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
                    // Filter out objects without quiz questions for learners mode
                    const validData = data.filter((item: any) => item.quiz_qa && item.quiz_qa.length > 0);

                    if (validData.length === 0) {
                        console.warn("No Level 1 data with valid quiz questions found for segment, skipping...");
                        handleSegmentComplete(true);
                        return;
                    }

                    // Transform contest API response to GameObject format
                    const gameData: GameObject[] = validData.map((item: any) => ({
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
                    setGameState('playing');
                    setTransitionMessage(null);
                } else {
                    console.error("No data found for segment, skipping...");
                    handleSegmentComplete(true); // Skip empty round?
                }
            } catch (error) {
                console.error("Error fetching segment data", error);
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
                    score: score, // Carry over score
                    elapsedTime: 0,
                    isComplete: false
                });

                setLevel2Timer(segment.round.time_limit_seconds);
                setIsLevel2Paused(true); // Pause until first image loads
                if (isContest) {
                    segmentStartTimeRef.current = Date.now();
                    startRound(picturesData.map(d => d.pictureId));
                    submitAnalytics(RoundStatus.STARTED, score);
                }
                setGameState('playing');
                setTransitionMessage(null);

            } catch (error) {
                console.error("Error starting quiz segment:", error);
                handleSegmentComplete(false);
            }
        }
    };

    const handleSegmentComplete = useCallback(async (isFullTimerExpired: boolean) => {
        console.log('[useGame] Segment Complete. Full Timer Expired:', isFullTimerExpired);

        // Submit analytics for this round - NON-BLOCKING
        submitAnalytics(RoundStatus.COMPLETED, score).catch(err =>
            console.error('[useGame] Analytics submission failed (background):', err)
        );

        // Add current round objects to level1Objects array for Level 2
        setLevel1Objects(prev => [...prev, ...gameData]);

        // Check if there are more segments
        if (segmentQueue.length > 0) {
            const nextSegment = segmentQueue.shift()!;
            setSegmentQueue([...segmentQueue]);
            setCurrentSegment(nextSegment);

            console.log('[useGame] Next Segment:', nextSegment);

            // Start next segment
            setCorrectlyMatchedIds(new Set());
            if (!isContest) {
                setScore(0);
            }

            // Start next segment
            startSegment(nextSegment);
        } else {
            // All segments complete
            console.log('[useGame] All segments complete!');
            setGameState('complete');
            playGameCompleteSound();
        }
    }, [segmentQueue, gameData, submitAnalytics, score, playGameCompleteSound]);

    // Handler for Continue button on round completion modal
    const handleContinueToNext = useCallback(() => {
        console.log('[useGame] User clicked Continue button');
        setShowRoundCompletionModal(false);
        setRoundCompletionData(null);
        handleSegmentComplete(false);
    }, [handleSegmentComplete]);

    const currentLanguageBcp47 = useMemo(() => {
        // In contest mode, always use the language of the current segment if available
        const langToResolve = (isContest && currentSegment) ? currentSegment.language : selectedLanguage;

        const currentLangObj = languages.find(l =>
            l.code.toLowerCase() === langToResolve.toLowerCase() ||
            l.name.toLowerCase() === langToResolve.toLowerCase()
        );
        return currentLangObj?.bcp47 || 'en-US';
    }, [selectedLanguage, languages, isContest, currentSegment]);

    const handleStartGame = useCallback(async () => {
        setGameStartError(null);
        setCorrectlyMatchedIds(new Set());
        setScore(0);
        setSheetSaveState('idle');
        setSheetSaveError(null);
        setLevel1Objects([]); // Reset accumulated objects

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
                return;
            }

            const queue: GameSegment[] = [];

            // Build queue: Level -> Round -> Language
            // User Requirement: Play all languages for a round before moving to next round.
            // gameStructure.levels -> level.rounds -> contestDetails.supported_languages

            const supportedLangs = contestDetails.supported_languages || [selectedLanguage]; // Fallback

            gameStructure.levels.sort((a, b) => a.level_seq - b.level_seq).forEach(level => {
                level.rounds.sort((a, b) => a.round_seq - b.round_seq).forEach(round => {
                    supportedLangs.forEach(lang => { // Inner loop: Languages
                        queue.push({ level, round, language: lang });
                    });
                });
            });

            console.log("Segment Queue Built:", queue);

            if (queue.length > 0) {
                const first = queue.shift();
                if (first) {
                    setSegmentQueue(queue);
                    setCurrentSegment(first);
                    startSegment(first);
                }
            } else {
                setGameStartError("Empty contest structure.");
            }

            return; // Exit standard flow
        }

        // Standard Game Flow (Non-Contest)
        const count = difficultyCounts[difficulty];
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
            // Filter out objects without quiz questions for learners mode
            const validData = data.filter(item => item.quiz_qa && item.quiz_qa.length > 0);

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
                setGameData([]);
                setShuffledDescriptions([]);
                setShuffledImages([]);
                setGameStartError('All objects found lack quiz questions for this language and category. Please try different settings.');
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


    // Ref to track if we've already triggered completion for the current round
    const completionTriggeredRef = useRef(false);

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

            // Capture current timer value to calculate time taken
            const timeAtCompletion = level1Timer;

            // Level 1 Round Complete
            const timeout = setTimeout(() => {
                console.log('[useGame] ✅ Round complete, showing modal/advancing');
                if (isContest && currentSegment) {
                    // Show modal for contest mode
                    setRoundCompletionData({
                        levelName: currentSegment.level.level_name,
                        roundName: currentSegment.round.round_name,
                        language: currentSegment.language,
                        score: score,
                        timeElapsed: gameLevel === 1 ? (currentSegment.round.time_limit_seconds - level1Timer) : (currentSegment.round.time_limit_seconds - level2Timer)
                    });
                    setShowRoundCompletionModal(true);
                } else {
                    // Standard non-contest flow
                    setGameState('complete');
                    playGameCompleteSound();
                    uploadScore(score);
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [gameState, gameData.length, correctlyMatchedIds.size, gameLevel, score, isContest, currentSegment]);

    const handleDrop = (imageId: string, descriptionId: string) => {
        if (imageId === descriptionId) {
            playCorrectSound();
            const matchedItem = gameData.find(item => item.id === imageId);
            if (matchedItem) {
                speakText(matchedItem.imageName, currentLanguageBcp47);
            }
            if (isContest) {
                trackMatch(imageId);
            }
            setScore(prevScore => prevScore + 10);
            setCorrectlyMatchedIds(prevIds => new Set(prevIds).add(imageId));
            setJustMatchedId(imageId);
            setTimeout(() => setJustMatchedId(null), 750);
        } else {
            if (isContest) {
                trackWrongMatch(descriptionId, imageId);
            }
            setScore(prevScore => prevScore - 5);
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
        speakText(imageName, currentLanguageBcp47);
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
        if (gameLevel === 2 && level2State && !level2State.isComplete && !isLevel2Paused) {
            const interval = setInterval(() => {
                setLevel2Timer(prev => {
                    if (isContest) {
                        // Contest Mode: Countdown
                        if (prev <= 0) {
                            clearInterval(interval);
                            console.log('[useGame] ⏰ Level 2 Timer expired!');
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
                                    language: currentSegment.language,
                                    score: finalRoundScore,
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
        setIsLevel2Paused(true);
        setGameLevel(2);
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
            // Add to matched questions
            const newMatched = new Set(currentPicture.matchedQuestions);
            newMatched.add(questionId);

            const updatedPictures = [...level2State.pictures];
            updatedPictures[level2State.currentPictureIndex] = {
                ...currentPicture,
                matchedQuestions: newMatched,
            };

            setLevel2State({
                ...level2State,
                pictures: updatedPictures,
                score: level2State.score + 15, // +15 for correct
            });

            // Pause timer if all correct questions for this picture are matched
            if (newMatched.size >= currentPicture.questions.length) {
                console.log('[useGame] All questions matched for this picture. Pausing timer for transition.');
                setIsLevel2Paused(true);
            }

            playCorrectSound();
        } else {
            // Incorrect answer
            const updatedPictures = [...level2State.pictures];
            updatedPictures[level2State.currentPictureIndex] = {
                ...currentPicture,
                wrongAttempts: currentPicture.wrongAttempts + 1,
            };

            setLevel2State({
                ...level2State,
                pictures: updatedPictures,
                score: level2State.score - 10, // -10 for incorrect
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
                setTimeout(() => {
                    handleLevel2Complete();
                }, 1500);
            }
        } else {
            // Move to next picture
            setIsLevel2Paused(true); // Pause while next image is loading
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
    const handleQuizComplete = useCallback((quizScore: number, correctCount: number) => {
        console.log('[useGame] Quiz Complete:', { quizScore, correctCount });
        // QuizGame returns its internal score, which we should add to our cumulative score
        // However, if the score is already carried over in level2State, we just sync it
        const newScore = score + quizScore;
        setScore(newScore);

        if (isContest && currentSegment) {
            setRoundCompletionData({
                levelName: currentSegment.level.level_name,
                roundName: currentSegment.round.round_name,
                language: currentSegment.language,
                score: newScore,
                timeElapsed: currentSegment.round.time_limit_seconds - (level2Timer || 0)
            });
            setShowRoundCompletionModal(true);
        } else {
            handleSegmentComplete(false);
        }
    }, [score, isContest, currentSegment, level2Timer, handleSegmentComplete]);

    const handleLevel2Complete = useCallback(() => {
        if (level2State) {
            setScore(level2State.score); // Sync score before completing segment
        }

        if (isContest && currentSegment) {
            setRoundCompletionData({
                levelName: currentSegment.level.level_name,
                roundName: currentSegment.round.round_name,
                language: currentSegment.language,
                score: level2State ? level2State.score : score,
                timeElapsed: currentSegment.round.time_limit_seconds - level2Timer
            });
            setShowRoundCompletionModal(true);
        } else if (isContest) {
            handleSegmentComplete(false);
        } else {
            handleResetGame();
        }
    }, [level2State, isContest, currentSegment, score, level2Timer, handleSegmentComplete, handleResetGame]);

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
            speakText(text, currentLanguageBcp47);
            if (isContest && pictureId) {
                trackHintFlip(pictureId);
            }
        }, [speakText, currentLanguageBcp47, isContest, trackHintFlip]),
        stopSpeech: stop,

        // Analytics
        trackVisibilityChange,
        trackHintFlip
    };
};