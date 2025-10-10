import type { Difficulty } from '../types/types';

export const difficultyCounts: Record<Difficulty, number> = {
  easy: 3,
  medium: 6,
  hard: 9,
};

export const DIFFICULTY_LEVELS: { name: Difficulty; label: string }[] = [
    { name: 'easy', label: 'Easy' },
    { name: 'medium', label: 'Medium' },
    { name: 'hard', label: 'Hard' },
];