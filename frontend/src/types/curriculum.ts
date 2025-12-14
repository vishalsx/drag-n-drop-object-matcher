export interface ImageRef {
    image_id?: string;
    image_hash: string;
    position?: number;
    object_name?: string;
}

export interface Page {
    page_id?: string;
    page_number?: number;
    title?: string;
    images: ImageRef[];
    story?: string;
    moral?: string;
}

export interface Chapter {
    chapter_id?: string;
    chapter_number?: number;
    chapter_name: string;
    description?: string;
    pages: Page[];
}

export interface Book {
    _id: string;
    title: string;
    language: string;
    author?: string;
    subject?: string;
    education_board?: string;
    grade_level?: string;
    tags?: string[];
    chapters?: Chapter[];
    chapter_count?: number;
    page_count?: number;
    image_count?: number;
    book_status?: string;
    created_by?: string;
    org_id?: string;
}
