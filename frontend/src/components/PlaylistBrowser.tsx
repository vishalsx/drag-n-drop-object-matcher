import React, { useState, useEffect } from 'react';
import { curriculumService } from '../services/curriculumService';
import { Book, Chapter, Page } from '../types/curriculum';
import { GameObject, Language } from '../types/types';
import { SearchIcon } from './Icons';

interface PlaylistBrowserProps {
    onPageSelect: (bookId: string, chapterId: string, pageId: string, bookTitle: string, chapterName: string, pageTitle: string) => void;
    disabled?: boolean;
    selectedLanguage?: string;
    languages?: Language[];
    selectedPageId?: string | null;
}

const PlaylistBrowser: React.FC<PlaylistBrowserProps> = ({ onPageSelect, disabled, selectedLanguage, languages, selectedPageId }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
    const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);

    // Search state
    const [searchText, setSearchText] = useState('');

    // Reset state when language changes
    useEffect(() => {
        setSearchText('');
        setBooks([]);
        setExpandedBookId(null);
        setExpandedChapterId(null);
        setError(null);
        setLoading(false);
    }, [selectedLanguage]);

    // Don't auto-load on mount to avoid 401 loops
    // User must click "Find" to search

    const loadBooks = async (query: string = '') => {
        console.log(`loadBooks called with query: "${query}"`);
        setLoading(true);
        setError(null);
        try {
            // Default search text to empty string or a wildcard if API requires it. 
            // The API requires search_text... I'll use a generic term or space if user hasn't typed.
            // Actually user requirement says "search_text" is required.
            // If empty, maybe search "all" or "a"?
            // I'll make it search " " if empty to try to get all, or just handle empty manually.
            const text = query.trim() || " ";

            // Convert language code to language name
            let languageName: string | undefined = undefined;
            if (selectedLanguage && languages && languages.length > 0) {
                const languageObj = languages.find(lang => lang.code === selectedLanguage);
                languageName = languageObj?.name;
                console.log(`Converting language code "${selectedLanguage}" to name "${languageName}"`);
            }

            console.log(`Calling curriculumService.searchBooks with text: "${text}", language: "${languageName}"`);
            const data = await curriculumService.searchBooks(text, languageName);
            console.log("Books loaded:", data);
            setBooks(data);
        } catch (err: any) {
            console.error("Failed to load books", err);
            // Don't set error if it's an auth error (401), as that will trigger logout/reload
            if (!err.message?.includes('Unauthorized')) {
                setError("Failed to load books.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("handleSearch triggered");
        loadBooks(searchText);
    };

    const toggleBook = async (book: Book) => {
        if (expandedBookId === book._id) {
            setExpandedBookId(null);
            return;
        }

        setExpandedBookId(book._id);

        // If chapters not loaded, fetch them
        if (!book.chapters || book.chapters.length === 0) {
            setLoading(true);
            try {
                const chapters = await curriculumService.getBookChapters(book._id);
                setBooks(prevBooks => prevBooks.map(b =>
                    b._id === book._id ? { ...b, chapters } : b
                ));
            } catch (err) {
                console.error("Failed to load chapters", err);
                // Optionally show error toast
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleChapter = async (bookId: string, chapter: Chapter) => {
        if (expandedChapterId === chapter.chapter_id) {
            setExpandedChapterId(null);
            return;
        }

        setExpandedChapterId(chapter.chapter_id || null);

        // If pages not loaded, fetch them
        if (!chapter.pages || chapter.pages.length === 0) {
            setLoading(true);
            try {
                // Determine chapter identifier (id or number?)
                // API signature uses "chapter_identifier". Implementation uses ID probably.
                const identifier = chapter.chapter_id || String(chapter.chapter_number);

                const pages = await curriculumService.getChapterPages(bookId, identifier);
                setBooks(prevBooks => prevBooks.map(b => {
                    if (b._id === bookId && b.chapters) {
                        return {
                            ...b,
                            chapters: b.chapters.map(c =>
                                c.chapter_id === chapter.chapter_id ? { ...c, pages } : c
                            )
                        };
                    }
                    return b;
                }));
            } catch (err) {
                console.error("Failed to load pages", err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePageClick = (book: Book, chapter: Chapter, page: Page) => {
        const pageId = page.page_id || String(page.page_number);
        const chapterId = chapter.chapter_id || String(chapter.chapter_number);
        const bookId = book._id;
        const bookTitle = book.title || '';
        const chapterName = chapter.chapter_name || '';
        const pageTitle = page.title || `Page ${page.page_number}`;
        // Just notify parent about selection, don't load game data yet
        onPageSelect(bookId, chapterId, pageId, bookTitle, chapterName, pageTitle);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-2 flex gap-2 w-full overflow-hidden">
                <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search books..."
                    className="flex-1 min-w-0 bg-slate-700 border border-slate-600 text-white py-1 px-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={disabled || loading}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center flex"
                    aria-label="Search"
                >
                    <SearchIcon className="w-4 h-4" />
                </button>
            </form>

            {loading && <div className="text-center text-slate-400 text-sm py-2">Loading...</div>}
            {error && <div className="text-center text-red-400 text-sm py-2">{error}</div>}

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {books.map(book => (
                    <div key={book._id} className="border border-slate-700 rounded bg-slate-800/80">
                        {/* Book Header */}
                        <button
                            onClick={() => toggleBook(book)}
                            className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-700 text-slate-200"
                        >
                            <span className="font-medium text-sm truncate" title={book.title}>📖 {book.title}</span>
                            <span className="text-xs text-slate-500">{expandedBookId === book._id ? '▼' : '▶'}</span>
                        </button>

                        {/* Chapters List */}
                        {expandedBookId === book._id && book.chapters && (
                            <div className="pl-2 border-l-2 border-slate-600 ml-2 space-y-1 mb-2">
                                {book.chapters.map(chapter => (
                                    <div key={chapter.chapter_id || chapter.chapter_number} className="">
                                        <button
                                            onClick={() => toggleChapter(book._id, chapter)}
                                            className="w-full text-left p-1 text-sm text-slate-300 hover:text-white flex items-center gap-2"
                                        >
                                            <span className="text-xs">{expandedChapterId === chapter.chapter_id ? '📂' : '📁'}</span>
                                            <span className="truncate">{chapter.chapter_name}</span>
                                        </button>

                                        {/* Pages List */}
                                        {expandedChapterId === chapter.chapter_id && chapter.pages && (
                                            <div className="pl-6 space-y-1 mt-1">
                                                {chapter.pages.map(page => (
                                                    <button
                                                        key={page.page_id || page.page_number}
                                                        onClick={() => handlePageClick(book, chapter, page)}
                                                        className={`w-full text-left text-xs py-1 flex items-center gap-2 ${selectedPageId === (page.page_id || String(page.page_number))
                                                            ? 'text-green-400 hover:text-green-300'
                                                            : 'text-slate-400 hover:text-blue-400'
                                                            }`}
                                                    >
                                                        <span>{selectedPageId === (page.page_id || String(page.page_number)) ? '✓' : '📄'}</span>
                                                        <span>
                                                            Page {page.page_number}
                                                            {page.title && ` - ${page.title}`}
                                                        </span>
                                                    </button>
                                                ))}
                                                {chapter.pages.length === 0 && <div className="text-xs text-slate-600 pl-4">No pages</div>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {book.chapters.length === 0 && <div className="text-sm text-slate-500 pl-2">No chapters</div>}
                            </div>
                        )}
                    </div>
                ))}
                {books.length === 0 && !loading && <div className="text-center text-slate-500 text-sm">No books found</div>}
            </div>
        </div>
    );
};

export default PlaylistBrowser;
