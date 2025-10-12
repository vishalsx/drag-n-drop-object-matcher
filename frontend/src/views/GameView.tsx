import React, { useState, useEffect } from 'react';
import DraggableDescription from '../components/DraggableDescription';
import DroppableImage from '../components/DroppableImage';
import SidePanel from '../components/SidePanel';
// Fix: Import CategoryFosItem to resolve type errors.
import type { GameObject, Difficulty, Language, CategoryFosItem } from '../types/types';
import PacManChaseAnimation from '../components/PacManChaseAnimation';
import SnakeGameAnimation from '../components/SnakeGameAnimation';

interface GameViewProps {
    score: number;
    shuffledDescriptions: GameObject[];
    shuffledImages: GameObject[];
    correctlyMatchedIds: Set<string>;
    wrongDropSourceId: string | null;
    wrongDropTargetId: string | null;
    justMatchedId: string | null;
    handleDrop: (imageId: string, descriptionId: string) => void;
    handleMatchedImageClick: (imageName: string) => void;
    gameState: 'idle' | 'loading' | 'playing' | 'complete';
    
    // SidePanel Props
    languages: Language[];
    selectedLanguage: string;
    onSelectLanguage: (lang: string) => void;
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    selectedFos: string;
    onSelectFos: (fos: string) => void;
    // Fix: Update prop types to match the data structure from the useGame hook.
    objectCategories: CategoryFosItem[];
    fieldsOfStudy: CategoryFosItem[];
    areCategoriesLoading: boolean;
    difficulty: Difficulty;
    onSelectDifficulty: (diff: Difficulty) => void;
    onStartGame: () => void;
    onWithdrawRequest: () => void;
}

const GameView: React.FC<GameViewProps> = (props) => {
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [animationToShow, setAnimationToShow] = useState<'pacman' | 'snake'>('pacman');

    useEffect(() => {
        if (props.gameState === 'idle') {
            setAnimationToShow(Math.random() < 0.5 ? 'pacman' : 'snake');
        }
    }, [props.gameState]);

    const handleDragEnter = (imageId: string) => setDropTargetId(imageId);
    const handleDragLeave = () => setDropTargetId(null);
    const onDropItem = (imageId: string, descriptionId: string) => {
        props.handleDrop(imageId, descriptionId);
        setDropTargetId(null); // Clear highlight on drop
    };

    return (
        <div className="flex flex-col lg:flex-row w-full p-4 gap-4 lg:p-8 lg:gap-8">
            {/* Side Panel: 20% width */}
            <div className="w-full lg:w-1/5 flex-shrink-0">
                <SidePanel
                    languages={props.languages}
                    selectedLanguage={props.selectedLanguage}
                    onSelectLanguage={props.onSelectLanguage}
                    currentCategory={props.selectedCategory}
                    onSelectCategory={props.onSelectCategory}
                    currentFos={props.selectedFos}
                    onSelectFos={props.onSelectFos}
                    objectCategories={props.objectCategories}
                    fieldsOfStudy={props.fieldsOfStudy}
                    areCategoriesLoading={props.areCategoriesLoading}
                    currentDifficulty={props.difficulty}
                    onSelectDifficulty={props.onSelectDifficulty}
                    onStartGame={props.onStartGame}
                    onWithdrawRequest={props.onWithdrawRequest}
                    gameState={props.gameState}
                />
            </div>

            {/* Hints Panel: 40% width */}
            <div className="w-full lg:w-2/5 p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col">
                <header className="text-center mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-slate-300">Hints</h2>
                    <p className="text-slate-400 mt-1 text-sm">Drag a hint to the matching object</p>
                </header>
                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                    {props.gameState === 'idle' && (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-slate-400 text-center text-lg">Choose your settings and click 'Play Game' to begin!</p>
                        </div>
                    )}
                    {(props.gameState === 'playing' || props.gameState === 'loading' || props.gameState === 'complete') && props.shuffledDescriptions.map(item => (
                        <DraggableDescription 
                            key={`desc-${item.id}`} 
                            id={item.id} 
                            description={item.description} 
                            shortHint={item.short_hint} 
                            objectName={item.imageName} 
                            isMatched={props.correctlyMatchedIds.has(item.id)} 
                            isWrongDrop={props.wrongDropSourceId === item.id} 
                            isJustMatched={props.justMatchedId === item.id}
                        />
                    ))}
                </div>
            </div>

            {/* Objects Panel: 40% width */}
            <div className="w-full lg:w-2/5 p-6 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 flex flex-col">
                <header className="text-center mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-slate-300">Objects</h2>
                    <div className="mt-1 text-2xl font-bold text-yellow-400">Score: {props.score}</div>
                </header>
                <div className="flex-grow overflow-y-auto pr-2">
                    {props.gameState === 'idle' ? (
                        <div className="h-full relative" aria-hidden="true">
                            {animationToShow === 'pacman' ? <PacManChaseAnimation /> : <SnakeGameAnimation />}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                            {(props.gameState === 'playing' || props.gameState === 'loading' || props.gameState === 'complete') && props.shuffledImages.map(item => (
                                <DroppableImage 
                                    key={`img-${item.id}`} 
                                    id={item.id} 
                                    imageUrl={item.imageUrl} 
                                    description={item.description} 
                                    tooltipText={item.object_description} 
                                    imageName={item.imageName} 
                                    isMatched={props.correctlyMatchedIds.has(item.id)} 
                                    onDropItem={onDropItem} 
                                    isDropTarget={dropTargetId === item.id} 
                                    onDragEnter={handleDragEnter} 
                                    onDragLeave={handleDragLeave} 
                                    isWrongDrop={props.wrongDropTargetId === item.id} 
                                    isJustMatched={props.justMatchedId === item.id} 
                                    onMatchedImageClick={props.handleMatchedImageClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameView;