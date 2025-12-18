import { authService } from './authService';
import { Book, Chapter, Page } from '../types/curriculum';
import { GameObject } from '../types/types';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8080";

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = authService.getToken();
    const orgId = authService.getOrgId();
    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Org-ID': orgId } : {}),
    };
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        if (token) {
            authService.logout();
            window.location.reload();
        }
        throw new Error('Unauthorized');
    }

    if (response.status >= 500) {
        throw new Error(`Server Error: ${response.statusText}`);
    }

    return response;
};

export const curriculumService = {
    searchBooks: async (searchText: string, language?: string): Promise<Book[]> => {
        const params = new URLSearchParams({ search_text: searchText });
        if (language) {
            params.append('language', language);
        }

        // Note: The backend endpoint is /curriculum/books/search.
        const response = await authenticatedFetch(`${API_BASE_URL}/curriculum/books/search?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to search books: ${response.statusText}`);
        }
        return response.json();
    },

    getBookChapters: async (bookId: string): Promise<Chapter[]> => {
        const response = await authenticatedFetch(`${API_BASE_URL}/curriculum/books/${bookId}/chapters`);
        if (!response.ok) {
            throw new Error(`Failed to get chapters: ${response.statusText}`);
        }
        return response.json();
    },

    getChapterPages: async (bookId: string, chapterIdentifier: string): Promise<Page[]> => {
        const response = await authenticatedFetch(`${API_BASE_URL}/curriculum/books/${bookId}/chapters/${chapterIdentifier}/pages`);
        if (!response.ok) {
            throw new Error(`Failed to get pages: ${response.statusText}`);
        }
        return response.json();
    },

    getPageGameData: async (bookId: string, chapterId: string, pageId: string): Promise<GameObject[]> => {
        const response = await authenticatedFetch(`${API_BASE_URL}/curriculum/play/page/${bookId}/${chapterId}/${pageId}`);
        if (!response.ok) {
            throw new Error(`Failed to get game data: ${response.statusText}`);
        }
        return response.json();
    }
};
