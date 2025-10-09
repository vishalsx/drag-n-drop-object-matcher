import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameObject, Difficulty, Language } from '../types/types';
import { fetchGameData, uploadScore, voteOnImage, saveTubSheet, USE_MOCK_API } from '../services/gameService';
import { shuffleArray } from '../utils/arrayUtils';
import { difficultyCounts } from '../constants/gameConstants';
import useSoundEffects from './useSoundEffects';
import { useSpeech } from './useSpeech';

type GameState = 'idle' | 'loading' | 'playing' | 'complete';

export const useGame = (languages: Language[]) => {
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
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});
    const [sheetSaveState, setSheetSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [sheetSaveError, setSheetSaveError] = useState<string | null>(null);
    const [votingInProgress, setVotingInProgress] = useState<Set<string>>(new Set());
    const [gameStartError, setGameStartError] = useState<string | null>(null);

    const { playCorrectSound, playWrongSound, playGameCompleteSound } = useSoundEffects();
    const { speakText } = useSpeech();

    useEffect(() => {
        if (languages && languages.length > 0) {
            // If the currently selected language is not in the new list, default to the first available language.
            const isSelectedLanguageValid = languages.some(lang => lang.code === selectedLanguage);
            if (!isSelectedLanguageValid) {
                setSelectedLanguage(languages[0].code);
            }
        }
    }, [languages, selectedLanguage]);

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
        const data = await fetchGameData(languageName, count, selectedCategory);
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
    }, [selectedLanguage, difficulty, selectedCategory, languages]);


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
                if (!USE_MOCK_API && result.data) {
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
    
    const handleSaveSheet = async () => {
        setSheetSaveState('saving');
        setSheetSaveError(null);
        const translationIds = gameData.map(item => item.id);
        const result = await saveTubSheet(translationIds);
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
    };

    const handleMatchedImageClick = (imageName: string) => {
        speakText(imageName, currentLanguageBcp47);
    };

    const clearGameStartError = useCallback(() => {
        setGameStartError(null);
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
        difficulty,
        voteErrors,
        sheetSaveState,
        sheetSaveError,
        votingInProgress,
        gameStartError,
        
        // State Setters
        setSelectedLanguage,
        setSelectedCategory,
        setDifficulty,

        // Handlers
        handleDrop,
        handleVote,
        handleSaveSheet,
        handleResetGame,
        handleStartGame,
        handleMatchedImageClick,
        clearGameStartError,
    };
};