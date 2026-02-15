import type { GameObject } from '../types/types';
import type { Level2Question } from '../types/level2Types';

/**
 * Generate 10 questions for a picture (6 correct, 4 incorrect)
 * Each question has an answer
 */
export const generateLevel2Questions = (picture: GameObject): Level2Question[] => {
    // If quiz_qa is available, use it
    if (picture.quiz_qa && picture.quiz_qa.length > 0) {
        const quizQa = picture.quiz_qa;

        // Group by difficulty
        const easy = quizQa.filter(q => q.difficulty_level.toLowerCase() === 'easy');
        const medium = quizQa.filter(q => q.difficulty_level.toLowerCase() === 'medium');
        const hard = quizQa.filter(q => q.difficulty_level.toLowerCase() === 'hard');

        const selectedQuestions: typeof quizQa = [];

        // Helper to pick random items
        const pickRandom = (arr: typeof quizQa, count: number) => {
            const shuffled = [...arr].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count);
        };

        // Strategy: Try to get a mix. e.g., 2 Easy, 2 Medium, 1 Hard
        // Adjust based on availability

        // We need total 6 questions
        const targetCount = 6;

        // Prioritize diversity
        if (easy.length > 0) selectedQuestions.push(...pickRandom(easy, 2));
        if (medium.length > 0) selectedQuestions.push(...pickRandom(medium, 2));
        if (hard.length > 0) selectedQuestions.push(...pickRandom(hard, 2));

        // If we don't have 6 yet, fill from remaining pool (excluding already selected)
        if (selectedQuestions.length < targetCount) {
            const usedQuestions = new Set(selectedQuestions);
            const remaining = quizQa.filter(q => !usedQuestions.has(q));
            const needed = targetCount - selectedQuestions.length;
            selectedQuestions.push(...pickRandom(remaining, needed));
        }

        // Map to Level2Question format
        return selectedQuestions.slice(0, targetCount).map((q, index) => ({
            id: `${picture.id}-q${index}`,
            question: q.question,
            answer: q.answer,
            isCorrect: true,
            difficulty_level: (q.difficulty_level?.toLowerCase() || 'medium') as any
        })).sort(() => Math.random() - 0.5);
    }

    return [];
};
