import axios from 'axios';

import { Contest } from '../types/contestTypes';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';
const LOGIN_API_URL = `${API_BASE_URL}/auth/login`;

interface LoginResponse {
    access_token: string;
    token_type: string;
    org_id?: string;
    username?: string;
    contest_details?: Contest;
    search_text?: string;
    contest_error?: string;
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


};
