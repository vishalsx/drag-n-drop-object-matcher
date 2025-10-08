import React from 'react';

const PacManLoader: React.FC = () => {
    return (
        <div className="flex items-center justify-center space-x-2" aria-label="Loading animation">
            <div className="w-12 h-12 relative">
                <div 
                    className="w-12 h-6 bg-yellow-400 rounded-t-full origin-bottom"
                    style={{ animation: 'pacman-chomp 0.6s infinite' }}
                />
                <div 
                    className="w-12 h-6 bg-yellow-400 rounded-b-full origin-top"
                    style={{ animation: 'pacman-chomp-bottom 0.6s infinite' }}
                />
            </div>
            {[...Array(4)].map((_, i) => (
                <div 
                    key={i}
                    className="w-3 h-3 bg-yellow-400 rounded-full"
                    style={{ animation: `pacman-dot-disappear 0.6s infinite ${i * 0.15}s` }}
                />
            ))}
        </div>
    );
};

export default PacManLoader;