import React, { useMemo } from 'react';
import type { Language } from '../types/types';

interface LanguageCarouselProps {
  languages: Language[];
  selectedLanguage: string;
  onSelectLanguage: (languageCode: string) => void;
}

const LanguageCarousel: React.FC<LanguageCarouselProps> = ({ languages, selectedLanguage, onSelectLanguage }) => {
  const currentIndex = useMemo(() => {
    const index = languages.findIndex(lang => lang.code === selectedLanguage);
    return index === -1 ? 0 : index;
  }, [selectedLanguage, languages]);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? languages.length - 1 : currentIndex - 1;
    onSelectLanguage(languages[newIndex].code);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === languages.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    onSelectLanguage(languages[newIndex].code);
  };

  return (
    <div className="relative w-full max-w-xs mx-auto h-16 flex items-center justify-center my-2">
      <button 
        onClick={goToPrevious} 
        className="absolute left-0 z-10 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Previous language"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div className="w-full h-full overflow-hidden">
        <div 
          className="relative w-full h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {languages.map((lang, index) => (
            <div
              key={lang.code}
              className="absolute w-full h-full flex items-center justify-center"
              style={{ left: `${index * 100}%` }}
            >
              <span 
                className="text-white font-bold text-xl tracking-wider drop-shadow-md select-none cursor-pointer"
                onClick={() => onSelectLanguage(lang.code)}
                role="button"
                tabIndex={-1}
              >
                {lang.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={goToNext} 
        className="absolute right-0 z-10 bg-slate-700/50 hover:bg-slate-600/80 rounded-full p-2 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Next language"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default LanguageCarousel;
