// Fix: Removed the triple-slash directive for "vite/client" as it was causing a type error and was not needed.
import type { GameObject, ApiPicture} from '../types/types';



// To prevent network errors during development when the backend is not available,
// we will use mock data directly. Set this to `true` to use mock data.
// Fix: Set USE_MOCK_API to true to prevent "File not found" errors when the backend is not running.
export const USE_MOCK_API = false;

// Helper function to provide mock game data for offline/fallback use
const getMockGameData = (count: number, language: string = 'English', category: string = 'Any'): GameObject[] => {
  // Fix: Renamed `objectDescription` to `object_description` in mock data to match the `GameObject` interface.
  const items: GameObject[] = [
    { id: '1', description: 'This object is a source of light, often found in a lamp.', short_hint: 'Source of light', imageUrl: 'https://picsum.photos/seed/bulb/400/400', imageName: 'Light Bulb', object_description: 'An electric device, which produces light from electricity. In addition to lighting a dark space, they can be used to show an electronic device is on, to direct traffic, for heat, and for many other purposes.', upvotes: 12, downvotes: 3, objectCategory: 'Technology' },
    { id: '2', description: 'Used for writing or drawing, has an eraser on one end.', short_hint: 'Writing tool', imageUrl: 'https://picsum.photos/seed/pencil/400/400', imageName: 'Pencil', object_description: 'A tool for writing or drawing, with a solid pigment core encased in a protective casing which prevents the core from being broken or marking the user\'s hand.', upvotes: 25, downvotes: 1, objectCategory: 'Household' },
    { id: '3', description: 'You read stories in this, it has many pages.', short_hint: 'Has many pages', imageUrl: 'https://picsum.photos/seed/book/400/400', imageName: 'Book', object_description: 'A set of written, printed, or blank sheets, made of ink, paper, parchment, or other materials, fastened together to hinge at one side.', upvotes: 42, downvotes: 0, objectCategory: 'Household' },
    { id: '4', description: 'Keeps your drinks hot or cold for hours.', short_hint: 'Insulated container', imageUrl: 'https://picsum.photos/seed/thermos/400/400', imageName: 'Thermos', object_description: 'An insulating storage vessel that greatly lengthens the time over which its contents remain hotter or cooler than the flask\'s surroundings.', upvotes: 8, downvotes: 5, objectCategory: 'Household' },
    { id: '5', description: 'A device to tell time, it can be on a wall or your wrist.', short_hint: 'Measures time', imageUrl: 'https://picsum.photos/seed/clock/400/400', imageName: 'Clock', object_description: 'An instrument to measure, keep, and indicate time. The clock is one of the oldest human inventions, meeting the need to measure intervals of time shorter than the natural units: the day, the lunar month, and the year.', upvotes: 18, downvotes: 2, objectCategory: 'Technology' },
    { id: '6', description: 'You use this small metal object to open doors.', short_hint: 'Opens locks', imageUrl: 'https://picsum.photos/seed/key/400/400', imageName: 'Key', object_description: 'A small piece of shaped metal with incisions cut to fit the wards of a particular lock, which is inserted into a lock and turned to open or close it.', upvotes: 33, downvotes: 7, objectCategory: 'Tools' },
    { id: '7', description: 'A common citrus fruit, it is yellow when ripe.', short_hint: 'Yellow fruit', imageUrl: 'https://picsum.photos/seed/lemon/400/400', imageName: 'Lemon', object_description: 'A species of small evergreen trees in the flowering plant family Rutaceae, native to Asia, primarily Northeast India, Northern Myanmar or China.', upvotes: 20, downvotes: 1, objectCategory: 'Nature' },
    { id: '8', description: 'Protects your head, often worn during sports or construction.', short_hint: 'Head protection', imageUrl: 'https://picsum.photos/seed/helmet/400/400', imageName: 'Helmet', object_description: 'A form of protective gear worn to protect the head. More specifically, a helmet complements the skull in protecting the human brain.', upvotes: 15, downvotes: 0, objectCategory: 'Tools' },
    { id: '9', description: 'A musical instrument with strings and a neck.', short_hint: 'Stringed instrument', imageUrl: 'https://picsum.photos/seed/guitar/400/400', imageName: 'Guitar', object_description: 'A fretted musical instrument that typically has six strings. It is held flat against the player\'s body and played by strumming or plucking the strings with the dominant hand, while simultaneously pressing selected strings against frets with the fingers of the opposite hand.', upvotes: 50, downvotes: 2, objectCategory: 'Household' }
  ];
  
  const filteredItems = category && category.toLowerCase() !== 'any' 
    ? items.filter(item => item.objectCategory.toLowerCase() === category.toLowerCase())
    : items;

  const slicedItems = filteredItems.slice(0, count);

  if (language.toLowerCase() === 'english') {
    return slicedItems;
  }
  
  // Simulate translation by prefixing the language code
  return slicedItems.map(item => ({
      ...item,
      description: `[${language.toUpperCase()}] ${item.description}`,
      short_hint: `[${language.toUpperCase()}] ${item.short_hint}`,
      imageName: `[${language.toUpperCase()}] ${item.imageName}`,
      object_description: `[${language.toUpperCase()}] ${item.object_description}`
  }));
};
  
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
// Use the Vite proxy path which is configured in vite.config.ts
// const API_BASE_URL = '/api';
// const API_BASE_URL = "http://localhost:8080"
const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8080";


export const fetchGameData = async (language: string = 'English', count: number = 6, category: string = 'Any'): Promise<GameObject[]> => {
  if (USE_MOCK_API) {
    console.warn(`[MOCK API] Fetching game data for language: ${language}, category: ${category}. To disable, set USE_MOCK_API to false in services/gameService.ts.`);
    // Simulate network delay to mimic a real API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockGameData(count, language, category);
  }

  console.log(`Fetching game data from API for language: ${language}, count: ${count}, category: ${category}`);
  try {
    // Assuming the backend endpoint is available at '/pictures/random'
    // Pass language and count as query parameters to the backend endpoint (default count 6)
    let url = `${API_BASE_URL}/pictures/random?language=${language}&count=${count}`;
    if (category && category.toLowerCase() !== 'any') {
      url += `&category=${encodeURIComponent(category)}`;
    }
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data: ApiPicture[] = await response.json();
    
    const gameData: GameObject[] = data.map((item: ApiPicture) => ({
      id: item.translations.translation_id,
      description: item.translations.object_hint,
      short_hint: item.translations.object_short_hint,
      imageUrl: `data:image/png;base64,${item.object.image_base64}`,
      imageName: item.translations.object_name,
      object_description: item.translations.object_description,
      upvotes: item.voting?.up_votes || 0,
      downvotes: item.voting?.down_votes || 0,
      objectCategory: item.object.object_category,
    }));
    
    


    console.log("Game data fetched and transformed successfully.", gameData);
    return gameData;
  } catch (error) {
    console.error("Failed to fetch or process game data:", error);
    // Fallback to mock data if the API fails
    console.warn(`API request failed for language "${language}". Serving mock data instead.`);
    return getMockGameData(count, language, category);
  }
};

export const uploadScore = async (score: number): Promise<{ success: boolean }> => {
  console.log(`Uploading score: ${score}`);
  // Simulate network delay for score submission
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Score uploaded successfully.");
  return Promise.resolve({ success: true });
};

// Type for the vote API success response
export interface VoteSuccessResponse {
  translation_id: string;
  up_votes: number;
  down_votes: number;
}

// Type for the vote API error response
export interface VoteErrorResponse {
  error: string;
}

type VoteApiResponse = VoteSuccessResponse | VoteErrorResponse;

export const voteOnImage = async (translationId: string, voteType: 'up' | 'down'): Promise<{ success: boolean; data?: VoteSuccessResponse; message?: string }> => {
  if (USE_MOCK_API) {
    console.warn(`[MOCK API] Voting on image ${translationId} (${voteType}). This is a mock response.`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        translation_id: String(translationId), 
        vote_type: String(voteType)
      }),
    });
    const responseData: VoteApiResponse = await response.json();

    if (!response.ok) {
      const message = (responseData as VoteErrorResponse).error || `API error: ${response.statusText}`;
      throw new Error(message);
    }
    
    // Check for application-level errors in a successful response (e.g., {"error": "..."})
    if ('error' in responseData) {
      return { success: false, message: responseData.error };
    }
    
    return { success: true, data: responseData as VoteSuccessResponse };
  } catch (error) {
    console.error(`Failed to vote on image ${translationId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
};

export const saveTubSheet = async (translationIds: string[]): Promise<{ success: boolean; message?: string }> => {
  if (USE_MOCK_API) {
    console.warn(`[MOCK API] Saving TUB Sheet with IDs: ${translationIds.join(', ')}. This is a mock response.`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/sheets/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ translation_ids: translationIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API error: ${response.statusText}` }));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    const responseData = await response.json();
    return { success: true, ...responseData };
  } catch (error) {
    console.error('Failed to save TUB Sheet:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
};
