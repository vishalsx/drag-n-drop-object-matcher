import React, { createContext, useState, useContext, useCallback } from 'react';
import Tooltip from '../components/Tooltip';

interface TooltipContextType {
  showTooltip: (content: string, rect: DOMRect) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tooltip, setTooltip] = useState<{ content: string; rect: DOMRect | null }>({ content: '', rect: null });

  const showTooltip = useCallback((content: string, rect: DOMRect) => {
    setTooltip({ content, rect });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip({ content: '', rect: null });
  }, []);

  const value = { showTooltip, hideTooltip };

  return (
    <TooltipContext.Provider value={value}>
      {children}
      <Tooltip content={tooltip.content} targetRect={tooltip.rect} />
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};
