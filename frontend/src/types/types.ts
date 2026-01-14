export interface GameObject {
  id: string; // Translation ID
  objectId: string; // Object ID
  description: string;
  // Fix: Add missing 'short_hint' property to the GameObject interface.
  short_hint: string;
  imageUrl: string;
  imageName: string;
  object_description: string;
  upvotes: number;
  downvotes: number;
  objectCategory: string;
  quiz_qa?: QuizQA[];
  story?: string;
  moral?: string;
}

export interface QuizQA {
  question: string;
  answer: string;
  difficulty_level: string;
}

// Type definition for the expected API response structure
export interface ApiPicture {

  object: {
    object_id: string;
    image_base64: string;
    image_hash: string;
    object_category: string;
  }
  translations: {
    translation_id: string;
    language: string;
    object_description: string;
    object_hint: string;
    object_name: string;
    object_short_hint: string;
    quiz_qa?: QuizQA[];
    story?: string;
    moral?: string;
  }
  voting: {
    up_votes?: number;
    down_votes?: number;
  }
  sheet: {
    sheet_id?: string;
    sheet_name?: string;
  }
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Language {
  code: string;
  name: string;
  imageUrl: string;
  bcp47: string;
}

export interface CategoryFosItem {
  en: string;
  translated: string;
}

export interface PlaylistItem {
  id: string;
  name: string;
}

export interface TubSheetItem {
  id: string;
  name: string;
}