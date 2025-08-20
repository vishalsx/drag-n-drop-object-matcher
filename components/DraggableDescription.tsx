
import React from 'react';

interface DraggableDescriptionProps {
  id: string;
  description: string;
  isMatched: boolean;
}

const DraggableDescription: React.FC<DraggableDescriptionProps> = ({ id, description, isMatched }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMatched) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("descriptionId", id);
  };

  const matchedStyles = "opacity-40 bg-green-900/50 cursor-not-allowed scale-95";
  const defaultStyles = "bg-slate-700 hover:bg-slate-600 hover:scale-105 cursor-grab active:cursor-grabbing";

  return (
    <div
      id={`desc-${id}`}
      draggable={!isMatched}
      onDragStart={handleDragStart}
      className={`p-4 rounded-lg border border-slate-600 shadow-md transition-all duration-300 ${isMatched ? matchedStyles : defaultStyles}`}
    >
      <p className="text-sm text-slate-300">{description}</p>
    </div>
  );
};

export default DraggableDescription;