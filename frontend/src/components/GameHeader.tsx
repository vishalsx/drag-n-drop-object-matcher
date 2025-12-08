import React from 'react';
import { Organisation } from '../services/routingService';

interface GameHeaderProps {
    orgData?: Organisation | null;
    gameLevel: number;
    gameState?: 'idle' | 'loading' | 'playing' | 'complete';
}

const GameHeader: React.FC<GameHeaderProps> = ({ orgData, gameLevel, gameState }) => {
    return (
        <div className="w-full bg-slate-800/70 border-b border-slate-700 px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                {orgData?.org_name ? (
                    <>
                        {orgData.logo_url ? (
                            <img
                                src={orgData.logo_url}
                                alt={`${orgData.org_name} logo`}
                                className="h-12 w-12 object-contain rounded-md"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-md bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">{orgData.org_name.charAt(0)}</span>
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-slate-200">
                            {orgData.org_name}
                        </h1>
                    </>
                ) : (
                    <>
                        <img
                            src="/alphatub-logo.png"
                            alt="alphaTUB logo"
                            className="h-12 w-12 object-contain rounded-md"
                        />
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500">
                            Welcome to the multilingual language learning platform!
                        </h1>
                    </>
                )}
            </div>

            {gameState && gameState !== 'idle' && (
                <div className="px-4 py-1 bg-slate-700 rounded-full border border-slate-600">
                    <span className="text-slate-300 font-semibold">Level {gameLevel}</span>
                </div>
            )}
        </div>
    );
};

export default GameHeader;
