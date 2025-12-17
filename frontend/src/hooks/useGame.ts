import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameObject, Difficulty, Language, CategoryFosItem } from '../types/types';
import type { Level2GameState, Level2PictureData } from '../types/level2Types';
import { fetchGameData, uploadScore, voteOnImage, saveTranslationSet, fetchCategoriesAndFos, fetchActiveLanguages } from '../services/gameService';
import { authService } from '../services/authService';
import { shuffleArray } from '../utils/arrayUtils';
import { difficultyCounts } from '../constants/gameConstants';
import useSoundEffects from './useSoundEffects';
import { useSpeech } from './useSpeech';
import { generateLevel2Questions } from '../utils/level2MockData';

type GameState = 'idle' | 'loading' | 'playing' | 'complete';
type GameLevel = 1 | 2;

const ANY_OPTION: CategoryFosItem = { en: 'Any', translated: 'Any' };

export const useGame = (shouldFetchLanguages: boolean = true) => {
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
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
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

    const { playCorrectSound, playWrongSound, playGameCompleteSound } = useSoundEffects();
    const { speakText, stop } = useSpeech();

    // Get the token to trigger re-fetch when it changes (e.g. after login)
    const token = authService.getToken();
    const orgId = authService.getOrgId();

    // Effect to load languages once on mount and set the initial language
    useEffect(() => {
        if (!shouldFetchLanguages) return;

        const loadInitialData = async () => {
            try {
                const activeLanguages = await fetchActiveLanguages();
                setLanguages(activeLanguages);

                if (activeLanguages.length > 0) {
                    const isDefaultLanguageValid = activeLanguages.some(lang => lang.code === 'English');

                    if (!isDefaultLanguageValid) {
                        setSelectedLanguage(activeLanguages[0].code);
                    }
                } else {
                    // If there are no languages, we can't play the game. Stop the main loading spinner.
                    // This case assumes fetch succeeded but returned empty list.
                    setIsAppLoading(false);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
                setGameStartError(error instanceof Error ? error.message : "Failed to load game data");
                setIsAppLoading(false);
            }
        };

        loadInitialData();
    }, [token, orgId, shouldFetchLanguages]);

    // Effect to load categories whenever the language changes. This is the single source of truth.
    useEffect(() => {
        // Don't run if the language isn't set, or if we don't have the language list yet to find the language name.
        if (!selectedLanguage || languages.length === 0) {
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

            const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
            const data = await fetchCategoriesAndFos(languageName);

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


    const currentLanguageBcp47 = useMemo(() => {
        return languages.find(lang => lang.code === selectedLanguage)?.bcp47 || 'en-US';
    }, [selectedLanguage, languages]);

    const handleStartGame = useCallback(async () => {
        const count = difficultyCounts[difficulty];
        setGameState('loading');
        setGameStartError(null);
        setCorrectlyMatchedIds(new Set());
        setScore(0);
        setSheetSaveState('idle');
        setSheetSaveError(null);

        const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
        // Pass selectedTubSheet as the translationSetId argument (it holds info.id if selected, or empty string)
        // If selectedTubSheet is set, we want to play that specific sheet.
        // Pass searchKeyword as searchText

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
            setGameData(data);
            setShuffledDescriptions(shuffleArray(data));
            setShuffledImages(shuffleArray(data));
            setGameState('playing');
        } else {
            setGameData([]);
            setShuffledDescriptions([]);
            setShuffledImages([]);
            setGameStartError('No objects could be found for the selected language and category. Please try different settings.');
            setGameState('idle');
        }
    }, [selectedLanguage, difficulty, selectedCategory, selectedFos, selectedTubSheet, searchKeyword, languages, selectedBookId, selectedChapterId, selectedPageId]);


    useEffect(() => {
        if (gameState === 'playing' && gameData.length > 0 && correctlyMatchedIds.size === gameData.length) {
            setGameState('complete');
            playGameCompleteSound();
            uploadScore(score);
        }
    }, [correctlyMatchedIds, gameData.length, score, gameState, playGameCompleteSound]);

    const handleDrop = (imageId: string, descriptionId: string) => {
        if (imageId === descriptionId) {
            playCorrectSound();
            const matchedItem = gameData.find(item => item.id === imageId);
            if (matchedItem) {
                speakText(matchedItem.imageName, currentLanguageBcp47);
            }
            setScore(prevScore => prevScore + 10);
            setCorrectlyMatchedIds(prevIds => new Set(prevIds).add(imageId));
            setJustMatchedId(imageId);
            setTimeout(() => setJustMatchedId(null), 750);
        } else {
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
                ? { ...item, upvotes: voteType === 'up' ? item.upvotes + 1 : item.upvotes, downvotes: voteType === 'down' ? item.downvotes + 1 : item.downvotes }
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
        const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
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

    // Level 2 Timer Effect
    useEffect(() => {
        if (gameLevel === 2 && level2State && !level2State.isComplete) {
            const interval = setInterval(() => {
                setLevel2Timer(prev => {
                    const newTime = prev + 1;
                    // Every 10 seconds, reduce score by 5
                    if (newTime % 10 === 0 && level2State) {
                        setLevel2State(prevState => prevState ? {
                            ...prevState,
                            score: prevState.score - 5
                        } : null);
                    }
                    return newTime;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [gameLevel, level2State]);

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
            setGameState('complete');
            playGameCompleteSound();
        } else {
            // Move to next picture
            setLevel2State({
                ...level2State,
                currentPictureIndex: nextIndex,
            });
        }
    };

    // Level 2: Close completion and return to idle
    const handleLevel2Complete = () => {
        setGameLevel(1);
        setLevel2State(null);
        setLevel2Timer(0);
        handleResetGame();
    };

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
        startGameWithData, // New export
        handleResetGame,
        clearGameStartError,
        handleStartLevel2,
        handleLevel2QuestionDrop,
        handleLevel2NextPicture,
        handleLevel2Complete,
        handleMatchedImageClick,
        handleSelectCategory,
        handleSelectFos,
        currentLanguageBcp47,
        handleSpeakHint: speakText,
        stopSpeech: stop,
    };
};