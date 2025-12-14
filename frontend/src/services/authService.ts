import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';
const LOGIN_API_URL = `${API_BASE_URL}/auth/login`;

interface LoginResponse {
    access_token: string;
    token_type: string;
    org_id?: string;
    username?: string;
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
                    // Fallback: use userId if response username is missing (though backend should send it)
                    localStorage.setItem('username', userId);
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

    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('org_id');
        localStorage.removeItem('username');
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
    }
};
