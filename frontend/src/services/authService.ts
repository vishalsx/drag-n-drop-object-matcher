import axios from 'axios';

import { Contest } from '../types/contestTypes';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';
const LOGIN_API_URL = `${API_BASE_URL}/auth/login`;

interface LoginResponse {
    access_token: string;
    token_type: string;
    org_id?: string;
    username?: string;
    languages_allowed?: string[];
    contest_details?: Contest;
    search_text?: string;
    contest_error?: string;
    email_id?: string;
    phone?: string;
    country?: string;
    address?: string;
    age?: number;
    dob?: string;
}

export const authService = {
    login: async (userId: string, password: string, orgCode?: string, param2?: string, param3?: string): Promise<string> => {
        try {
            // The 422 error suggests the server expects application/x-www-form-urlencoded
            // which is standard for OAuth2PasswordRequestForm in FastAPI.
            const params = new URLSearchParams();
            params.append('username', userId);
            params.append('password', password);
            if (orgCode) {
                params.append('org_code', orgCode);
            }
            if (param2) {
                params.append('param2', param2);
            }
            if (param3) {
                params.append('param3', param3);
            }

            // Detect and send user's timezone for localized error messages
            try {
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                params.append('timezone', userTimezone);
            } catch (error) {
                console.warn('[Auth] Could not detect timezone:', error);
                // Continue without timezone - backend will fall back to UTC
            }

            const response = await axios.post<LoginResponse>(LOGIN_API_URL, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                localStorage.setItem('auth_token', response.data.access_token);
                if (response.data.org_id) {
                    localStorage.setItem('org_id', response.data.org_id);
                }
                if (response.data.username) {
                    localStorage.setItem('username', response.data.username);
                } else {
                    localStorage.setItem('username', userId);
                }

                if (response.data.contest_details) {
                    localStorage.setItem('contest_details', JSON.stringify(response.data.contest_details));
                } else {
                    localStorage.removeItem('contest_details');
                }

                if (response.data.search_text) {
                    localStorage.setItem('contest_search_text', response.data.search_text);
                } else {
                    localStorage.removeItem('contest_search_text');
                }

                if (response.data.contest_error) {
                    localStorage.setItem('contest_error', response.data.contest_error);
                } else {
                    localStorage.removeItem('contest_error');
                }

                // Store languages_allowed if available in the response
                if (response.data.languages_allowed) {
                    localStorage.setItem('languages_allowed', JSON.stringify(response.data.languages_allowed));
                } else {
                    localStorage.removeItem('languages_allowed');
                }

                if (response.data.email_id) localStorage.setItem('email_id', response.data.email_id);
                if (response.data.phone) localStorage.setItem('phone', response.data.phone);
                if (response.data.country) localStorage.setItem('country', response.data.country);

                return response.data.access_token;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    anonymousLogin: async (orgCode: string): Promise<string> => {
        try {
            const params = new URLSearchParams();
            params.append('org_code', orgCode);

            const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/anonymous-login`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                localStorage.setItem('auth_token', response.data.access_token);
                if (response.data.org_id) {
                    localStorage.setItem('org_id', response.data.org_id);
                }
                if (response.data.username) {
                    localStorage.setItem('username', response.data.username);
                }
                // Mark as anonymous session
                localStorage.setItem('is_anonymous', 'true');

                return response.data.access_token;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('Anonymous login failed:', error);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('org_id');
        localStorage.removeItem('username');
        localStorage.removeItem('contest_details');
        localStorage.removeItem('contest_search_text');
        localStorage.removeItem('contest_error');
        localStorage.removeItem('is_anonymous');
        localStorage.removeItem('languages_allowed');
        localStorage.removeItem('email_id');
        localStorage.removeItem('phone');
        localStorage.removeItem('country');
    },

    getToken: (): string | null => {
        return localStorage.getItem('auth_token');
    },

    getOrgId: (): string | null => {
        return localStorage.getItem('org_id');
    },

    setOrgId: (orgId: string) => {
        localStorage.setItem('org_id', orgId);
    },

    removeOrgId: () => {
        localStorage.removeItem('org_id');
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('auth_token');
    },

    getUsername: (): string | null => {
        return localStorage.getItem('username');
    },

    getContestDetails: (): Contest | null => {
        const details = localStorage.getItem('contest_details');
        return details ? JSON.parse(details) : null;
    },

    getContestSearchText: (): string | null => {
        return localStorage.getItem('contest_search_text');
    },

    getContestError: (): string | null => {
        return localStorage.getItem('contest_error');
    },

    register: async (data: {
        username: string;
        password: string;
        email?: string;
        age?: number;
        country?: string;
        phone?: string;
        address?: string;
        languages?: string[];
        dob?: string;
    }): Promise<any> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
            return response.data;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    },

    getLanguagesAllowed: (): string[] | null => {
        const langs = localStorage.getItem('languages_allowed');
        console.log("[authService] getLanguagesAllowed raw from localStorage:", langs);
        try {
            return langs ? JSON.parse(langs) : null;
        } catch (e) {
            console.error("[authService] Failed to parse languages_allowed:", e);
            return null;
        }
    },

    getEmailId: (): string | null => localStorage.getItem('email_id'),
    getPhone: (): string | null => localStorage.getItem('phone'),
    getCountry: (): string | null => localStorage.getItem('country'),

    revalidate: async (orgCode: string, param2?: string, param3?: string): Promise<boolean> => {
        const token = localStorage.getItem('auth_token');
        if (!token) return false;

        try {
            const params = new URLSearchParams();
            params.append('org_code', orgCode);
            if (param2) params.append('param2', param2);
            if (param3) params.append('param3', param3);

            try {
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                params.append('timezone', userTimezone);
            } catch (error) {
                console.warn('[Auth] Could not detect timezone:', error);
            }

            const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/revalidate`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.access_token) {
                // Update storage with latest info from revalidation
                localStorage.setItem('auth_token', response.data.access_token);
                if (response.data.org_id) localStorage.setItem('org_id', response.data.org_id);
                if (response.data.username) localStorage.setItem('username', response.data.username);

                if (response.data.contest_details) {
                    localStorage.setItem('contest_details', JSON.stringify(response.data.contest_details));
                }
                if (response.data.search_text) {
                    localStorage.setItem('contest_search_text', response.data.search_text);
                }
                if (response.data.languages_allowed) {
                    localStorage.setItem('languages_allowed', JSON.stringify(response.data.languages_allowed));
                }

                if (response.data.email_id) localStorage.setItem('email_id', response.data.email_id);
                if (response.data.phone) localStorage.setItem('phone', response.data.phone);
                if (response.data.country) localStorage.setItem('country', response.data.country);

                return true;
            }
            return false;
        } catch (error) {
            console.error('Revalidation failed:', error);
            return false;
        }
    }
};
