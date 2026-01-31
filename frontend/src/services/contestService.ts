import axios from 'axios';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';

import { Contest, LeaderboardEntry, LeaderboardResponse } from '../types/contestTypes';

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = authService.getToken();
    const orgId = authService.getOrgId();
    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Org-ID': orgId } : {}),
    };
    return fetch(url, { ...options, headers });
};

export const contestService = {
    checkParticipant: async (username: string): Promise<{ found: boolean; data?: any; message?: string }> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/contest/check-participant/${username}`);
            return response.data;
        } catch (error) {
            console.error('Check participant error:', error);
            return { found: false };
        }
    },

    authenticateParticipant: async (username: string, password: string): Promise<{ found: boolean; data?: any }> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/contest/authenticate-participant`, { username, password });
            return response.data;
        } catch (error) {
            console.error('Authenticate participant error:', error);
            throw error;
        }
    },

    contestRegister: async (data: {
        username: string;
        password: string;
        contestId: string;
        email?: string;
        age: number;
        country: string;
        phone_number?: string;
        address?: string;
        selected_languages: string[];
    }): Promise<any> => {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await axios.post(`${API_BASE_URL}/contest/register`, {
                username: data.username,
                password: data.password,
                email_id: data.email,
                contest_id: data.contestId,
                age: data.age,
                country: data.country,
                phone_number: data.phone_number,
                address: data.address,
                selected_languages: data.selected_languages,
                entry_sources: { type: "individual" }
            }, {
                params: { timezone: userTimezone }
            });
            return response.data;
        } catch (error) {
            console.error('Contest registration failed:', error);
            throw error;
        }
    },

    contestLogin: async (username: string, password: string, contestId: string): Promise<string> => {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await axios.post(`${API_BASE_URL}/contest/login`, {
                username,
                password,
                contest_id: contestId
            }, {
                params: { timezone: userTimezone }
            });

            if (response.data.access_token) {
                localStorage.setItem('auth_token', response.data.access_token);
                if (response.data.username) {
                    localStorage.setItem('username', response.data.username);
                } else {
                    localStorage.setItem('username', username);
                }

                if (response.data.contest_details) {
                    localStorage.setItem('contest_details', JSON.stringify(response.data.contest_details));
                }
                if (response.data.search_text) {
                    localStorage.setItem('contest_search_text', response.data.search_text);
                }
                if (response.data.contest_error) {
                    localStorage.setItem('contest_error', response.data.contest_error);
                }

                return response.data.access_token;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('Contest login failed:', error);
            throw error;
        }
    },

    submitContestScores: async (
        contestId: string,
        username: string,
        scores: { language: string; score: number; time_taken?: number }[],
        isFinal: boolean = false
    ): Promise<void> => {
        try {
            const token = authService.getToken();
            await axios.post(
                `${API_BASE_URL}/contest/submit-scores`,
                {
                    contest_id: contestId,
                    username,
                    round_scores: scores,
                    is_final: isFinal
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
        } catch (error) {
            console.error('Failed to submit contest scores:', error);
            // Don't throw - allow logout to proceed even if submission fails
        }
    },

    getContestLeaderboard: async (contestId: string, limit: number = 20): Promise<LeaderboardResponse> => {
        try {
            const username = authService.getUsername();
            const response = await authenticatedFetch(
                `${API_BASE_URL}/contest/${contestId}/leaderboard?limit=${limit}${username ? `&current_username=${username}` : ''}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error('Failed to fetch contest leaderboard:', error);
            return { entries: [], average_time_all_participants: 0 };
        }
    },

    getContestsByOrg: async (orgId: string): Promise<any[]> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/contest/list/${orgId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch contests by org:', error);
            return [];
        }
    },

    fetchGameContent: async (
        contestId: string,
        levelSeq: number,
        roundSeq: number,
        language?: string,
        category?: string,
        fieldOfStudy?: string
    ): Promise<any[]> => {
        try {
            const token = authService.getToken();
            const params: any = { language: language || 'en' };
            if (category) params.category = category;
            if (fieldOfStudy) params.field_of_study = fieldOfStudy;

            const response = await axios.get(
                `${API_BASE_URL}/contest/${contestId}/play/level/${levelSeq}/round/${roundSeq}`,
                {
                    params,
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to fetch game content:', error);
            throw error;
        }
    },

    enterContest: async (contestId: string): Promise<any> => {
        try {
            const token = authService.getToken();
            const username = authService.getUsername();
            const response = await axios.post(
                `${API_BASE_URL}/contest/enter`,
                { contest_id: contestId },
                {
                    params: { current_username: username },
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to enter contest:', error);
            throw error;
        }
    },

    logProgress: async (data: {
        contest_id: string;
        username: string;
        level: number;
        round: number;
        score: number;
        language: string;
        time_taken: number;
    }): Promise<void> => {
        try {
            const token = authService.getToken();
            await axios.post(
                `${API_BASE_URL}/contest/log-progress`,
                data,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
        } catch (error) {
            console.error('Failed to log progress:', error);
            // Non-blocking, so we just log the error
        }
    },

    getParticipantSummary: async (contestId: string, username: string): Promise<{ total_score: number; breakdown: any[] }> => {
        try {
            const token = authService.getToken();
            const response = await axios.get(
                `${API_BASE_URL}/contest/${contestId}/participant/summary`,
                {
                    params: { username },
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to get participant summary:', error);
            throw error;
        }
    }
};
