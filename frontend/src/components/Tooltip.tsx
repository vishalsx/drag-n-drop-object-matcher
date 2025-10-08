import React from 'react';

interface TooltipProps {
  content: string;
  top: number;
  left: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, top, left }) => {
  if (!content) return null;

  return (
    <div 
      style={{ top: top, left: left }} 
      className="fixed transform -translate-x-1/2 -translate-y-full -mt-2 w-max max-w-xs p-2 bg-yellow-400 text-black text-xs rounded-md shadow-lg z-[60] pointer-events-none"
      role="tooltip"
    >
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-yellow-400"></div>
    </div>
  );
};

export default Tooltip;
