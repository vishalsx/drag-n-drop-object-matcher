
export interface GameObject {
  id: string;
  description: string;
  short_hint: string;
  imageUrl: string;
  imageName: string;
  object_description: string;
  upvotes: number;
  downvotes: number;
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
  
  // translation_id: string;
  // language: string;
  // object_category: string;
  // image_base64: string;
  // up_votes?: number;
  // down_votes?: number;
  //sequence_number: number;
  // image_name: string;
  // result: {
 // object_hint_en: string;
  // object_hint_translated: string;
  // object_name_en: string;
  // object_name_translated: string;
  // object_description_en: string;
  // object_description_translated: string;
  

  // };
  
  }