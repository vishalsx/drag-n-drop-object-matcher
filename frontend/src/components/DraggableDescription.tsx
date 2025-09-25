import React from 'react';

interface DraggableDescriptionProps {
  id: string;
  description: string;
  isMatched: boolean;
  isWrongDrop: boolean;
  isJustMatched: boolean;
}

const DraggableDescription: React.FC<DraggableDescriptionProps> = (props) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (props.isMatched) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("descriptionId", props.id);
  };

  const matchedStyles = "opacity-40 bg-green-900/50 cursor-not-allowed scale-95";
  const defaultStyles = "bg-slate-700 hover:bg-slate-600 hover:scale-105 cursor-grab active:cursor-grabbing";
  const wrongDropStyles = "border-red-500 animate-shake";
  const justMatchedStyles = "animate-success-pulse";

  return (
    <div
      id={`desc-${props.id}`}
      draggable={!props.isMatched}
      onDragStart={handleDragStart}
      className={`p-4 rounded-lg border border-slate-600 shadow-md transition-all duration-300 ${props.isMatched ? matchedStyles : defaultStyles} ${props.isWrongDrop ? wrongDropStyles : ''} ${props.isJustMatched ? justMatchedStyles : ''}`}
    >
      <p className="text-sm text-slate-300">{props.description}</p>
    </div>
  );
};

export default DraggableDescription;