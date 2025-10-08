import React, { useState, useEffect, useRef, useCallback } from 'react';

const PACMAN_SIZE = 48;
const DOT_SIZE = 12;
const PACMAN_SPEED = 1.5;
const NUM_DOTS = 5;

interface Position {
  x: number;
  y: number;
}

interface PacmanState extends Position {
  direction: 'up' | 'down' | 'left' | 'right';
}

interface Dot extends Position {
  id: number;
}

interface SceneState {
    pacman: PacmanState;
    dots: Dot[];
}

const PacManChaseAnimation: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scene, setScene] = useState<SceneState>({
        pacman: { x: 50, y: 50, direction: 'right' },
        dots: [],
    });
    
    const animationFrameId = useRef<number | null>(null);

    const gameLoop = useCallback(() => {
        if (!containerRef.current) {
            animationFrameId.current = requestAnimationFrame(gameLoop);
            return;
        }
        
        const { width, height } = containerRef.current.getBoundingClientRect();

        setScene(currentScene => {
            const { pacman, dots } = currentScene;

            if (dots.length === 0) {
                return currentScene; // Nothing to chase
            }

            // 1. Find nearest dot using center points
            const pacmanCenterX = pacman.x + PACMAN_SIZE / 2;
            const pacmanCenterY = pacman.y + PACMAN_SIZE / 2;

            let nearestDot: Dot | null = null;
            let minDistanceSq = Infinity;

            dots.forEach(dot => {
                const dotCenterX = dot.x + DOT_SIZE / 2;
                const dotCenterY = dot.y + DOT_SIZE / 2;
                const dx = dotCenterX - pacmanCenterX;
                const dy = dotCenterY - pacmanCenterY;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    nearestDot = dot;
                }
            });

            // 2. Calculate new Pacman position based on centers
            let newPacmanState = { ...pacman };

            if (nearestDot) {
                const dotCenterX = nearestDot.x + DOT_SIZE / 2;
                const dotCenterY = nearestDot.y + DOT_SIZE / 2;
                
                const dx = dotCenterX - pacmanCenterX;
                const dy = dotCenterY - pacmanCenterY;
                const distanceToDot = Math.sqrt(minDistanceSq);
                
                // This prevents overshooting
                const moveDistance = Math.min(PACMAN_SPEED, distanceToDot);

                let newX = pacman.x;
                let newY = pacman.y;
                
                if (distanceToDot > 0) {
                    newX += (dx / distanceToDot) * moveDistance;
                    newY += (dy / distanceToDot) * moveDistance;
                }

                // Update direction for visual rotation
                let newDirection: PacmanState['direction'] = pacman.direction;
                if (Math.abs(dx) > Math.abs(dy)) {
                    newDirection = dx > 0 ? 'right' : 'left';
                } else {
                    newDirection = dy > 0 ? 'down' : 'up';
                }

                // Boundary checks
                newX = Math.max(0, Math.min(width - PACMAN_SIZE, newX));
                newY = Math.max(0, Math.min(height - PACMAN_SIZE, newY));

                newPacmanState = { x: newX, y: newY, direction: newDirection };
            }
            
            // 3. Check for eaten dots and respawn them
            const newPacmanCenterX = newPacmanState.x + PACMAN_SIZE / 2;
            const newPacmanCenterY = newPacmanState.y + PACMAN_SIZE / 2;
            
            let dotsEatenCount = 0;
            const dotsToKeep = dots.filter(dot => {
                const dotCenterX = dot.x + DOT_SIZE / 2;
                const dotCenterY = dot.y + DOT_SIZE / 2;
                const dx = dotCenterX - newPacmanCenterX;
                const dy = dotCenterY - newPacmanCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const collisionThreshold = (PACMAN_SIZE / 2);
                if (distance < collisionThreshold) {
                    dotsEatenCount++;
                    return false;
                }
                return true;
            });

            let newDots = dotsToKeep;
            if (dotsEatenCount > 0) {
                const dotsToAdd = Array.from({ length: dotsEatenCount }).map(() => ({
                    id: Date.now() + Math.random(),
                    x: Math.random() * (width - DOT_SIZE),
                    y: Math.random() * (height - DOT_SIZE),
                }));
                newDots = [...dotsToKeep, ...dotsToAdd];
            }

            return { pacman: newPacmanState, dots: newDots };
        });

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry && entry.contentRect.width > 0) {
                 const { width, height } = entry.contentRect;
                 setScene(currentScene => {
                     // Only initialize dots if they haven't been set yet.
                     if (currentScene.dots.length === 0) {
                        const initialDots = Array.from({ length: NUM_DOTS }).map(() => ({
                            id: Date.now() + Math.random(),
                            x: Math.random() * (width - DOT_SIZE),
                            y: Math.random() * (height - DOT_SIZE),
                        }));
                        return { ...currentScene, dots: initialDots };
                     }
                     return currentScene;
                 });
            }
        });

        const currentContainer = containerRef.current;
        if (currentContainer) {
            observer.observe(currentContainer);
        }

        animationFrameId.current = requestAnimationFrame(gameLoop);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (currentContainer) {
                observer.unobserve(currentContainer);
            }
        };
    }, [gameLoop]);

    const getRotation = (direction: PacmanState['direction']) => {
        switch (direction) {
            case 'up': return '-90deg';
            case 'down': return '90deg';
            case 'left': return '180deg';
            case 'right': return '0deg';
            default: return '0deg';
        }
    };

    const { pacman, dots } = scene;

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden" aria-hidden="true">
            {/* Pacman */}
            <div
                className="absolute"
                style={{
                    width: `${PACMAN_SIZE}px`,
                    height: `${PACMAN_SIZE}px`,
                    left: `${pacman.x}px`,
                    top: `${pacman.y}px`,
                    transform: `rotate(${getRotation(pacman.direction)})`,
                }}
            >
                <div
                    className="w-full h-1/2 bg-yellow-400 rounded-t-full origin-bottom"
                    style={{ animation: 'pacman-chomp 0.6s infinite' }}
                />
                <div
                    className="w-full h-1/2 bg-yellow-400 rounded-b-full origin-top"
                    style={{ animation: 'pacman-chomp-bottom 0.6s infinite' }}
                />
            </div>

            {/* Dots */}
            {dots.map(dot => (
                <div
                    key={dot.id}
                    className="absolute bg-yellow-400 rounded-full animate-fadeIn"
                    style={{
                        width: `${DOT_SIZE}px`,
                        height: `${DOT_SIZE}px`,
                        left: `${dot.x}px`,
                        top: `${dot.y}px`,
                    }}
                />
            ))}
        </div>
    );
};

export default PacManChaseAnimation;
