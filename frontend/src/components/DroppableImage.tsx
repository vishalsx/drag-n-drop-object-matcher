import React, { useState } from 'react';


interface CheckIconProps {
  className?: string;
}

const CheckIcon: React.FC<CheckIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={3}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface CrossIconProps {
  className?: string;
}

const CrossIcon: React.FC<CrossIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={3}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
//     <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.333a2 2 0 001.9-1.333l2.267-6.667a2 2 0 00-1.9-2.667H13.5V5.5a2.5 2.5 0 00-5 0v1.833H6z" />
//   </svg>
// );

// const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => (
//   <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
//     <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1H6.667a2 2 0 00-1.9 1.333L2.5 10a2 2 0 001.9 2.667H6.5v4.5a2.5 2.5 0 005 0V12.167H14z" />
//   </svg>
// );

const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
    />
  </svg>
);

const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"
    />
  </svg>
);

interface DroppableImageProps {
  id: string;
  imageUrl: string;
  description: string;
  imageName: string;
  tooltipText: string;
  isMatched: boolean;
  onDropItem: (imageId: string, descriptionId: string) => void;
  isDropTarget: boolean;
  onDragEnter: (imageId: string) => void;
  onDragLeave: () => void;
  isWrongDrop: boolean;
  isJustMatched: boolean;
  upvotes: number;
  downvotes: number;
  onVote: (translationId: string, voteType: 'up' | 'down') => void;
  voteError: string | null;

}

const DroppableImage: React.FC<DroppableImageProps> = ({
  id,
  imageUrl,
  description,
  imageName,
  tooltipText,
  isMatched,
  onDropItem,
  isDropTarget,
  onDragEnter,
  onDragLeave,
  isWrongDrop,
  isJustMatched,
  upvotes,
  downvotes,
  onVote,
  voteError
}) => {

  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMatched) return;
    const descriptionId = e.dataTransfer.getData("descriptionId");
    onDropItem(id, descriptionId);
    onDragLeave(); // Clear highlight on drop
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMatched) return;
    onDragEnter(id);
  }
  const handleMouseEnter = () => {
    if (isMatched) {
      setIsTooltipVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  return (
    <div
      id={`img-${id}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={onDragLeave}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group w-full h-48 rounded-lg shadow-lg transition-all duration-300 border-2 ${isDropTarget ? 'border-blue-500 scale-105' : 'border-transparent'} ${isMatched ? 'border-green-500' : ''} ${isWrongDrop ? 'border-red-500 animate-shake' : ''} ${isJustMatched ? 'animate-success-pulse' : ''}`}
    >
      {isMatched && isTooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-yellow-400 text-black text-xs rounded-md shadow-lg z-[60] pointer-events-none">
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-yellow-400"></div>
        </div>
      )}
      <img src={imageUrl} alt={description} className="w-full h-full object-cover rounded-lg pointer-events-none" />
      {isMatched && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-30 flex flex-col items-center justify-center text-center p-2 pointer-events-none rounded-lg">
        <CheckIcon className="w-16 h-16 text-white" />
        <p className="text-black font-bold text-lg mt-2 break-all">{imageName}</p>
      </div>
      )}
      {isWrongDrop && !isMatched && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center pointer-events-none rounded-lg">
          <CrossIcon className="w-20 h-20 text-white" />
        </div>
      )}
      {!isMatched && (
        <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/30 p-1.5 rounded-full text-white text-xs font-bold">
          <button onClick={() => onVote(id, 'up')} className="p-1 rounded-full hover:bg-green-500/50 transition-colors" aria-label="Vote up">
            <ThumbsUpIcon className="w-4 h-4" />
          </button>
          <span className="min-w-[1.5ch] text-center">{upvotes}</span>
          <button onClick={() => onVote(id, 'down')} className="p-1 rounded-full hover:bg-red-500/50 transition-colors" aria-label="Vote down">
            <ThumbsDownIcon className="w-4 h-4" />
          </button>
          <span className="min-w-[1.5ch] text-center">{downvotes}</span>
        </div>
      )}
      {voteError && (
        <div className="absolute -bottom-5 left-0 right-0 flex justify-center items-center pointer-events-none">
            <p className="px-2 py-1 bg-red-600 text-white text-xs rounded-md shadow-lg z-10" role="alert">
                {voteError}
            </p>
        </div>
      )}
    </div>
  );
};

export default DroppableImage;