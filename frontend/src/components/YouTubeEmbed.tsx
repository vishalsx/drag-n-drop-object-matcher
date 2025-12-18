import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface YouTubeEmbedProps {
    videoId: string;
    onEnded: () => void;
    className?: string;
    muted?: boolean;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId, onEnded, className, muted = false }) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load the IFrame Player API code asynchronously.
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                initializePlayer();
            };
        } else {
            initializePlayer();
        }

        function initializePlayer() {
            // If player already exists, just load new video
            if (playerRef.current) {
                playerRef.current.loadVideoById(videoId);
                return;
            }

            // Create new player
            if (containerRef.current && window.YT) {
                playerRef.current = new window.YT.Player(containerRef.current, {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        'autoplay': 1,
                        'controls': 0,
                        'disablekb': 1,
                        'fs': 0,
                        'modestbranding': 1,
                        'rel': 0,
                        'showinfo': 0,
                        'mute': muted ? 1 : 0,
                        'loop': 0
                    },
                    events: {
                        'onStateChange': onPlayerStateChange
                    }
                });
            }
        }

        return () => {
            // Optional: Clean up player on unmount if needed
            // But usually for this specific simple case we might want to keep it or just let it destroy with the div
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, []); // Run once on mount to setup

    // Effect to handle videoId changes
    useEffect(() => {
        if (playerRef.current && playerRef.current.loadVideoById) {
            playerRef.current.loadVideoById(videoId);
        }
    }, [videoId]);

    // Effect to handle muted changes
    useEffect(() => {
        if (playerRef.current && playerRef.current.mute) {
            if (muted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
            }
        }
    }, [muted]);

    const onPlayerStateChange = (event: any) => {
        // YT.PlayerState.ENDED is 0
        if (event.data === 0) {
            onEnded();
        }
    };

    return <div ref={containerRef} className={className} />;
};

export default YouTubeEmbed;
