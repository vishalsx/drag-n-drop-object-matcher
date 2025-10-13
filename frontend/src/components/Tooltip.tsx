import React, { useRef, useLayoutEffect, useState } from 'react';

interface TooltipProps {
  content: string;
  targetRect: DOMRect | null;
}

const Tooltip: React.FC<TooltipProps> = ({ content, targetRect }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (tooltipRef.current && targetRect) {
      const tooltipEl = tooltipRef.current;
      const { width: tooltipWidth, height: tooltipHeight } = tooltipEl.getBoundingClientRect();
      const { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight } = targetRect;
      
      const viewportWidth = window.innerWidth;
      const GAP = 8;

      // Default position: centered above the target
      let top = targetTop - tooltipHeight - GAP;
      let left = targetLeft + targetWidth / 2 - tooltipWidth / 2;

      // Adjust horizontal position to stay in viewport
      if (left < GAP) {
        left = GAP;
      } else if (left + tooltipWidth > viewportWidth - GAP) {
        left = viewportWidth - tooltipWidth - GAP;
      }
      
      let finalPosition: 'above' | 'below' = 'above';
      // If not enough space above, position below
      if (top < GAP) {
          top = targetTop + targetHeight + GAP;
          finalPosition = 'below';
      }

      setStyle({
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
      });

      // Position arrow
      const arrowLeft = targetLeft + targetWidth / 2 - left;
      
      if(finalPosition === 'above') {
        setArrowStyle({
            top: '100%',
            left: `${arrowLeft}px`,
            transform: 'translateX(-50%)',
            borderTop: '4px solid #facc15', // tailwind yellow-400
            borderBottom: '0',
        });
      } else {
         setArrowStyle({
            bottom: '100%',
            left: `${arrowLeft}px`,
            transform: 'translateX(-50%)',
            borderBottom: '4px solid #facc15', // tailwind yellow-400
            borderTop: '0',
        });
      }

    } else {
        setStyle({ opacity: 0 });
    }
  }, [content, targetRect]);

  if (!content || !targetRect) return null;

  return (
    <div 
      ref={tooltipRef}
      style={style}
      className="fixed w-max max-w-xs p-2 bg-yellow-400 text-black text-xs rounded-md shadow-lg z-[60] pointer-events-none transition-opacity duration-200"
      role="tooltip"
    >
      {content}
      <div 
        className="absolute w-0 h-0 border-x-4 border-x-transparent"
        style={arrowStyle}
      />
    </div>
  );
};

export default Tooltip;