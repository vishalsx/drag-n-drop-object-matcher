
import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 150 }).map((_, index) => {
      const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      return {
        id: index,
        style: {
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 3 + 2}s`,
          animationDelay: `${Math.random() * 2}s`,
          backgroundColor: randomColor,
          width: `${Math.floor(Math.random() * 8) + 8}px`,
          height: `${Math.floor(Math.random() * 6) + 6}px`,
          opacity: Math.random(),
          transform: `rotate(${Math.random() * 360}deg)`
        }
      };
    });
    setPieces(newPieces);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
       <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotateZ(0deg); }
          100% { transform: translateY(110vh) rotateZ(720deg); }
        }
        .confetti-piece {
          position: absolute;
          animation-name: confetti-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
      {pieces.map(piece => (
        <div key={piece.id} className="confetti-piece" style={piece.style}></div>
      ))}
    </div>
  );
};

export default Confetti;