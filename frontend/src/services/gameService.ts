import type { GameObject, ApiPicture, Language, CategoryFosItem } from '../types/types';

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
//const API_BASE_URL = '/api';
const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8080";
// const API_BASE_URL = "http://localhost:8080";
import { authService } from './authService';

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = authService.getToken();
  const orgId = authService.getOrgId();

  // Ensure we don't send "null" or "undefined" strings
  const validToken = token && token !== 'null' && token !== 'undefined' ? token : null;
  const validOrgId = orgId && orgId !== 'null' && orgId !== 'undefined' ? orgId : null;

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (validToken) {
    headers['Authorization'] = `Bearer ${validToken}`;
  }
  if (validOrgId) {
    headers['X-Org-ID'] = validOrgId;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.warn(`401 Unauthorized received from ${url}. Token present: ${!!validToken}`);

    // Always clear session on 401 to prevent sticky invalid states
    authService.logout();

    // Only reload if we had a token (to avoid infinite reload loops on public pages if they return 401)
    // However, since base URL should work without token, a 401 here is weird. 
    // We'll reload only if we are not already on the landing page or login page to try and recover.
    if (validToken) {
      window.location.reload();
    }

    throw new Error('Unauthorized');
  }

  if (response.status >= 500) {
    throw new Error(`Server Error: ${response.statusText}`);
  }

  return response;
};

export const fetchActiveLanguages = async (orgId?: string | null): Promise<Language[]> => {
  let response: Response;

  if (orgId) {
    const headers: Record<string, string> = { 'X-Org-ID': orgId };
    response = await authenticatedFetch(`${API_BASE_URL}/active/languages`, { headers });
  } else {
    // Force PUBLIC fetch by using raw fetch without any automatic X-Org-ID headers
    response = await fetch(`${API_BASE_URL}/active/languages`);
  }

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.statusText}`);
  }

  const data: { name: string; code: string; bcp47: string; imageURL?: string }[] = await response.json();

  const languages: Language[] = data.map(lang => ({
    name: lang.name,
    code: lang.code,
    bcp47: lang.bcp47,
    imageUrl: lang.imageURL || `https://picsum.photos/seed/${lang.code.toLowerCase()}/300/200`,
  }));

  console.log("Active languages fetched successfully.", languages);
  return languages;
};

// export const fetchCategoriesAndFos = async (language: string): Promise<{ object_categories: string[]; fields_of_study: string[] }> => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/active/object-categories-FOS/${language}`);
//     if (!response.ok) {
//       throw new Error(`Network response was not ok: ${response.statusText}`);
//     }
//     const data = await response.json();
//     console.log(`Categories and FOS for ${language} fetched successfully.`, data);
//     return data;
//   } catch (error) {
//     console.error(`Failed to fetch categories and FOS for ${language}:`, error);
//     // Return empty arrays on error to avoid breaking the UI
//     return { 
//         object_categories: [], 
//         fields_of_study: [] 
//     };
//   }
// };
export const fetchCategoriesAndFos = async (language: string, orgId?: string | null, refresh: boolean = false): Promise<{ object_categories: CategoryFosItem[]; fields_of_study: CategoryFosItem[] }> => {
  try {
    const headers: Record<string, string> = {};
    if (orgId) {
      headers['X-Org-ID'] = orgId;
    }

    let url = `${API_BASE_URL}/active/object-categories-FOS/${language}`;
    if (refresh) {
      url += `?refresh=true`;
    }

    const response = await authenticatedFetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`Categories and FOS for ${language} fetched successfully. (refresh=${refresh})`, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch categories and FOS for ${language}:`, error);
    // Return empty arrays on error to avoid breaking the UI
    return {
      object_categories: [],
      fields_of_study: []
    };
  }
};


export const fetchGameData = async (
  language: string = 'English',
  count: number = 6,
  category: string = 'Any',
  fieldOfStudy: string = 'Any',
  translationSetId?: string,
  searchText?: string,
  bookId?: string,
  chapterId?: string,
  pageId?: string,
  orgCode?: string,
  objectIds?: string[]
): Promise<GameObject[]> => {
  console.log(`Fetching game data from API for language: ${language}, count: ${count}, category: ${category}, FOS: ${fieldOfStudy}, TS: ${translationSetId}, searchText: ${searchText}, Book: ${bookId}, Chapter: ${chapterId}, Page: ${pageId}, OrgCode: ${orgCode}, ObjectIds: ${objectIds}`);
  try {
    // Assuming the backend endpoint is available at '/pictures/random'
    // Pass language and count as query parameters to the backend endpoint (default count 6)
    let url = `${API_BASE_URL}/pictures/random?language=${language}&count=${count}`;

    if (objectIds && objectIds.length > 0) {
      url += `&object_ids=${encodeURIComponent(objectIds.join(','))}`;
    }

    if (orgCode) {
      url += `&org_code=${encodeURIComponent(orgCode)}`;
    }

    if (bookId && chapterId && pageId) {
      url += `&book_id=${bookId}&chapter_id=${chapterId}&page_id=${pageId}`;
    } else if (translationSetId) {
      url += `&translation_set_id=${translationSetId}`;
    } else if (searchText) {
      url += `&search_text=${encodeURIComponent(searchText)}`;
    } else {
      if (category && category.toLowerCase() !== 'any') {
        url += `&category=${encodeURIComponent(category)}`;
      } else if (fieldOfStudy && fieldOfStudy.toLowerCase() !== 'any') {
        url += `&field_of_study=${encodeURIComponent(fieldOfStudy)}`;
      }
    }
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data: ApiPicture[] = await response.json();

    const gameData: GameObject[] = data.map((item: ApiPicture) => ({
      id: item.translations.translation_id,
      objectId: item.object.object_id,
      description: item.translations.object_hint,
      short_hint: item.translations.object_short_hint,
      imageUrl: `data:image/png;base64,${item.object.image_base64}`,
      imageName: item.translations.object_name,
      object_description: item.translations.object_description,
      upvotes: item.voting?.up_votes || 0,
      downvotes: item.voting?.down_votes || 0,
      objectCategory: item.object.object_category,
      quiz_qa: item.translations.quiz_qa,
      story: item.translations.story,
      moral: item.translations.moral,
    }));




    console.log("Game data fetched and transformed successfully.", gameData);
    return gameData;
  } catch (error) {
    console.error("Failed to fetch or process game data:", error);
    // Return an empty array on failure. The calling hook will handle this.
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
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/vote`, {
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

export const saveTranslationSet = async (name: string, language: string, translationIds: string[], category: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/TS/save_translation_set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        language: language,
        image_translation_ids: translationIds,
        user_id: 'anonymous',
        category: category,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API error: ${response.statusText}` }));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    const responseData = await response.json();
    return { success: true, ...responseData };
  } catch (error) {
    console.error('Failed to save Translation Set:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
};

export const fetchContestLevelContent = async (
  contestId: string,
  levelSeq: number,
  roundSeq: number,
  language: string,
  category?: string,
  fieldOfStudy?: string
): Promise<any[]> => {
  try {
    const timestamp = Date.now();
    let url = `${API_BASE_URL}/contest/${contestId}/play/level/${levelSeq}/round/${roundSeq}?language=${encodeURIComponent(language)}&_t=${timestamp}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (fieldOfStudy) url += `&field_of_study=${encodeURIComponent(fieldOfStudy)}`;

    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch level content: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching contest level content:`, error);
    throw error;
  }
};