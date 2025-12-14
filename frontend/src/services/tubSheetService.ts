import axios from 'axios';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';

export interface TubSheetItem {
    id: string; // Corresponds to set_id
    name: string;
    language: string;
    category: string;
    // Add other fields as needed
}

export const tubSheetService = {
    getTubSheets: async (
        language: string,
        category?: string,
        fieldOfStudy?: string,
        genericSearch?: string
    ): Promise<TubSheetItem[]> => {
        try {
            const token = authService.getToken();
            const config = {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                params: {
                    language,
                    ...(category && category !== 'Any' && { object_category: category }),
                    ...(fieldOfStudy && fieldOfStudy !== 'Any' && { field_of_study: fieldOfStudy }),
                    ...(genericSearch && { generic_search: genericSearch })
                }
            };

            // backend returns a list of dicts. We map it to our TubSheetItem interface if needed
            // The backend returns: { set_id, name, language, category, ... }
            const response = await axios.get(`${API_BASE_URL}/TS/get_TS_list`, config);

            return response.data.map((item: any) => ({
                id: item.set_id,
                name: item.name,
                language: item.language,
                category: item.category
            }));

        } catch (error) {
            console.error('Error fetching TubSheets:', error);
            // Return empty list on error to avoid breaking UI (or rethrow if you want to show error)
            return [];
        }
    }
};
