import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants ---
const GRID_SIZE = 20; // Size of each grid cell
const GAME_SPEED = 100; // Milliseconds between game ticks
const INITIAL_SNAKE_LENGTH = 3;
const SNAKE_COLOR = 'bg-teal-400';
const FOOD_COLORS = ['bg-red-500', 'bg-purple-500', 'bg-blue-500', 'bg-orange-500', 'bg-pink-500'];

// --- Types ---
interface Position {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// --- Helper Functions ---
const getRandomColor = () => FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];

const SnakeGameAnimation: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [grid, setGrid] = useState({ width: 0, height: 0 });

    const createInitialState = useCallback(() => {
        if (grid.width === 0 || grid.height === 0) {
            return { snake: [], food: { x: -1, y: -1, color: getRandomColor() }, direction: 'RIGHT' as Direction };
        }
        const startX = Math.floor(grid.width / 2);
        const startY = Math.floor(grid.height / 2);

        const snake: Position[] = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            snake.push({ x: startX - i, y: startY });
        }

        return {
            snake,
            food: {
                x: Math.floor(Math.random() * grid.width),
                y: Math.floor(Math.random() * grid.height),
                color: getRandomColor(),
            },
            direction: 'RIGHT' as Direction,
        };
    }, [grid.width, grid.height]);
    
    const [snake, setSnake] = useState<Position[]>([]);
    const [food, setFood] = useState({ x: -1, y: -1, color: 'bg-red-500' });
    const [direction, setDirection] = useState<Direction>('RIGHT');

    // Refs to hold the latest state for the game loop to avoid stale closures
    const snakeRef = useRef(snake);
    const directionRef = useRef(direction);
    const foodRef = useRef(food);

    useEffect(() => {
        snakeRef.current = snake;
        directionRef.current = direction;
        foodRef.current = food;
    }, [snake, direction, food]);


    const resetGame = useCallback(() => {
        const initialState = createInitialState();
        setSnake(initialState.snake);
        setFood(initialState.food);
        setDirection(initialState.direction);
    }, [createInitialState]);


    useEffect(() => {
        if (grid.width > 0 && grid.height > 0) {
            resetGame();
        }
    }, [grid.width, grid.height, resetGame]);


    const gameLoop = useCallback(() => {
        const currentSnake = [...snakeRef.current];
        if (currentSnake.length === 0 || grid.width === 0 || grid.height === 0) return;

        const head = { ...currentSnake[0] };
        
        // --- AI Movement ---
        const currentDirection = directionRef.current;
        const foodPos = foodRef.current;
        const dx = foodPos.x - head.x;
        const dy = foodPos.y - head.y;

        let nextDirection = currentDirection;
        const canGoUp = currentDirection !== 'DOWN';
        const canGoDown = currentDirection !== 'UP';
        const canGoLeft = currentDirection !== 'RIGHT';
        const canGoRight = currentDirection !== 'LEFT';

        // AI strategy: Move toward the food on the axis with the greatest distance,
        // while respecting the rule that the snake cannot reverse direction.
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && canGoRight) {
                nextDirection = 'RIGHT';
            } else if (dx < 0 && canGoLeft) {
                nextDirection = 'LEFT';
            } else if (dy > 0 && canGoDown) { // fallback to vertical
                nextDirection = 'DOWN';
            } else if (dy < 0 && canGoUp) {
                nextDirection = 'UP';
            }
        } else {
            if (dy > 0 && canGoDown) {
                nextDirection = 'DOWN';
            } else if (dy < 0 && canGoUp) {
                nextDirection = 'UP';
            } else if (dx > 0 && canGoRight) { // fallback to horizontal
                nextDirection = 'RIGHT';
            } else if (dx < 0 && canGoLeft) {
                nextDirection = 'LEFT';
            }
        }

        setDirection(nextDirection);

        // --- Update head position ---
        switch (nextDirection) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
        }

        // --- Collision Detection ---
        if (head.x < 0 || head.x >= grid.width || head.y < 0 || head.y >= grid.height || currentSnake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
            resetGame();
            return;
        }
        
        const newSnake = [head, ...currentSnake];

        // --- Food Consumption ---
        if (head.x === foodPos.x && head.y === foodPos.y) {
            let newFoodPos: Position;
            do {
                newFoodPos = {
                    x: Math.floor(Math.random() * grid.width),
                    y: Math.floor(Math.random() * grid.height),
                };
            } while (newSnake.some(segment => segment.x === newFoodPos.x && segment.y === newFoodPos.y));
            setFood({ ...newFoodPos, color: getRandomColor() });
        } else {
            newSnake.pop();
        }

        setSnake(newSnake);

    }, [grid.width, grid.height, resetGame]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setGrid({
                    width: Math.floor(width / GRID_SIZE),
                    height: Math.floor(height / GRID_SIZE),
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        const currentContainer = containerRef.current;
        if (currentContainer) {
            observer.observe(currentContainer);
        }

        handleResize();

        const intervalId = setInterval(gameLoop, GAME_SPEED);

        return () => {
            clearInterval(intervalId);
            if (currentContainer) {
                observer.unobserve(currentContainer);
            }
        };
    }, [gameLoop]);

    return (
        <div ref={containerRef} className="w-full h-full relative bg-slate-900/50 rounded-lg overflow-hidden" aria-hidden="true">
            {snake.map((segment, index) => (
                <div
                    key={index}
                    className={`absolute rounded-sm ${SNAKE_COLOR}`}
                    style={{
                        width: `${GRID_SIZE - 1}px`,
                        height: `${GRID_SIZE - 1}px`,
                        left: `${segment.x * GRID_SIZE}px`,
                        top: `${segment.y * GRID_SIZE}px`,
                        transition: 'left 0.1s linear, top 0.1s linear',
                    }}
                />
            ))}
            <div
                className={`absolute rounded-full ${food.color}`}
                style={{
                    width: `${GRID_SIZE}px`,
                    height: `${GRID_SIZE}px`,
                    left: `${food.x * GRID_SIZE}px`,
                    top: `${food.y * GRID_SIZE}px`,
                }}
            />
        </div>
    );
};

export default SnakeGameAnimation;