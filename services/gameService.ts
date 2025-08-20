import type { GameObject } from '../types';

// Type definition for the expected API response structure
export interface ApiPicture {
  sequence_number: number;
  image_name: string;
  requested_language: string;
  result: {
  object_hint_en: string;
  object_name_en: string;
  object_description_en: string;
  };
  image_base64: string;
  }

  
// Helper to determine the image MIME type from its filename
const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      // A generic fallback for unknown image types
      return 'application/octet-stream';
  }
};
const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8000';


export const fetchGameData = async (): Promise<GameObject[]> => {
  console.log("Fetching game data from API...");
  try {
    // Assuming the backend endpoint is available at '/api/pictures'
    const response = await fetch(`${API_BASE_URL}/pictures/random`);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data: ApiPicture[] = await response.json();

    // Transform the API data into the format the frontend components expect
    const gameData: GameObject[] = data.map(item => ({
      id: String(item.sequence_number),
      description: item.result.object_hint_en,
      imageUrl: `data:${getMimeType(item.image_name)};base64,${item.image_base64}`,
      imageName: item.result.object_name_en
    }));
    
    console.log("Game data fetched and transformed successfully.");
    return gameData;
  } catch (error) {
    console.error("Failed to fetch or process game data:", error);
    // Return an empty array on error to prevent the application from crashing
    return [];
  }
};

export const uploadScore = async (score: number): Promise<{ success: boolean }> => {
  console.log(`Uploading score: ${score}`);
  // Simulate network delay for score submission
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Score uploaded successfully.");
  return Promise.resolve({ success: true });
};