import React from 'react';
import { useTooltip } from '../context/TooltipContext';


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

interface DroppableImageProps {
  id: string;
  imageUrl: string;
  description: string;
  imageName: string;
  tooltipText: string;
  isMatched: boolean;
  onDropItem: (imageId: string, descriptionId:string) => void;
  isDropTarget: boolean;
  onDragEnter: (imageId: string) => void;
  onDragLeave: () => void;
  isWrongDrop: boolean;
  isJustMatched: boolean;
  onMatchedImageClick: (imageName: string) => void;
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
  onMatchedImageClick
}) => {
  const { showTooltip, hideTooltip } = useTooltip();

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
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMatched) {
      showTooltip(tooltipText, e.currentTarget.getBoundingClientRect());
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const handleClick = () => {
    if (isMatched) {
      onMatchedImageClick(imageName);
    }
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
      onClick={handleClick}
      className={`relative group w-full aspect-[4/5] rounded-lg shadow-lg transition-all duration-300 border-2  ${isDropTarget ? 'border-blue-500 scale-105' : 'border-transparent'} ${isMatched ? 'border-green-500 cursor-pointer' : ''} ${isWrongDrop ? 'border-red-500 animate-shake' : ''} ${isJustMatched ? 'animate-success-pulse' : ''}`}
    >
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
    </div>
  );
};

export default DroppableImage;