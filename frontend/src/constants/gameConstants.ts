// import type { Language, Difficulty } from '../types/types';

// export const LANGUAGES: Language[] = [
//   { code: 'English', name: 'English', imageUrl: 'https://picsum.photos/seed/english/300/200', bcp47: 'en-US' },
//   { code: 'Hindi', name: 'Hindi', imageUrl: 'https://picsum.photos/seed/hindi/300/200', bcp47: 'hi-IN' },
//   { code: 'Kokborok', name: 'Kokborok', imageUrl: 'https://picsum.photos/seed/kokborok/300/200', bcp47: 'trp-latn' },
//   { code: 'Gujarati', name: 'Gujarati', imageUrl: 'https://picsum.photos/seed/gujrati/300/200', bcp47: 'gu-IN' },
//   { code: 'Punjabi', name: 'Punjabi', imageUrl: 'https://picsum.photos/seed/punjabi/300/200', bcp47: 'pa-IN' },
//   { code: 'French', name: 'French', imageUrl: 'https://picsum.photos/seed/french/300/200', bcp47: 'fr-FR' },
//   { code: 'Vietnamese', name: 'Vietnamese', imageUrl: 'https://picsum.photos/seed/vietnamese/300/200', bcp47: 'vi-VN' },
//   { code: 'Arabic', name: 'Arabic', imageUrl: 'https://picsum.photos/seed/arabic/300/200', bcp47: 'ar-SA' },
//   { code: 'Urdu', name: 'Urdu', imageUrl: 'https://picsum.photos/seed/urdu/300/200', bcp47: 'ur-PK' },
// ];

// export const difficultyCounts: Record<Difficulty, number> = {
//   easy: 3,
//   medium: 6,
//   hard: 9,
// };

// export const CATEGORIES = ['Any', 'Household', 'Nature', 'Technology', 'Tools'];

// export const DIFFICULTY_LEVELS: { name: Difficulty; label: string }[] = [
//     { name: 'easy', label: 'Easy' },
//     { name: 'medium', label: 'Medium' },
//     { name: 'hard', label: 'Hard' },
// ];

import type { Difficulty } from '../types/types';

export const difficultyCounts: Record<Difficulty, number> = {
  easy: 3,
  medium: 6,
  hard: 9,
};

export const CATEGORIES = ['Any', 'Household', 'Nature', 'Technology', 'Tools'];

export const DIFFICULTY_LEVELS: { name: Difficulty; label: string }[] = [
    { name: 'easy', label: 'Easy' },
    { name: 'medium', label: 'Medium' },
    { name: 'hard', label: 'Hard' },
];