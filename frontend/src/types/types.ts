export interface GameObject {
  id: string;
  description: string;
  // Fix: Add missing 'short_hint' property to the GameObject interface.
  short_hint: string;
  imageUrl: string;
  imageName: string;
  object_description: string;
  upvotes: number;
  downvotes: number;
  objectCategory: string;
}

// Type definition for the expected API response structure
export interface ApiPicture {
  
  object:{
    object_id: string;
    image_base64: string;
    image_hash: string;
    object_category: string;
  }
  translations:{
    translation_id: string;
    language: string;
    object_description: string;
    object_hint: string;
    object_name: string;
    object_short_hint: string;
  }
  voting:{
    up_votes?: number;
    down_votes?: number;
  }
  sheet:{
    sheet_id?: string;
    sheet_name?: string;
  }
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Language {
  name: string;
  code: string;
  imageUrl: string;
  bcp47: string;
}
