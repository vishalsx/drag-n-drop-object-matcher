import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';

export interface Organisation {
    org_code: string;
    org_type: 'Private' | 'Public';
    org_id: string;
    org_name?: string;
    logo_url?: string;
}

export const determineOrg = async (pathSegment: string): Promise<Organisation | null> => {
    try {
        const response = await axios.post<Organisation>(`${API_BASE_URL}/determine_org`, null, {
            params: { path_segment: pathSegment }
        });
        return response.data;
    } catch (error) {
        console.error('Error determining organization:', error);
        return null;
    }
};
