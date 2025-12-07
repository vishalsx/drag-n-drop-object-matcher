import { useCallback } from 'react';
import { fetchCloudTTS } from '../services/cloudTtsService';
import { useBrowserSpeech } from './useBrowserSpeech';

// Set to true to prefer high-quality cloud voices, false to use browser-only voices.
const USE_CLOUD_TTS = true;

let audioPlayer: HTMLAudioElement | null = null;

const getAudioPlayer = (): HTMLAudioElement => {
    if (!audioPlayer) {
        audioPlayer = new Audio();
    }
    return audioPlayer;
};

/**
 * Custom hook to provide text-to-speech functionality.
 * It intelligently chooses between a high-quality cloud-based TTS service
 * and the browser's native Speech Synthesis API as a fallback.
 */
export const useSpeech = () => {
    const { speak: speakWithBrowser, cancel: cancelBrowserSpeech } = useBrowserSpeech();

    const playAudioFromUrl = useCallback((url: string) => {
        const player = getAudioPlayer();
        if (!player.paused) {
            player.pause();
            player.currentTime = 0;
        }
        player.src = url;
        player.play().catch(e => console.error("Audio playback error:", e));
    }, []);

    const stop = useCallback(() => {
        const player = getAudioPlayer();
        if (!player.paused) {
            player.pause();
            player.currentTime = 0;
        }
        cancelBrowserSpeech();
    }, [cancelBrowserSpeech]);

    const speakText = useCallback(async (text: string, languageCode: string) => {
        if (USE_CLOUD_TTS) {
            try {
                const audioUrl = await fetchCloudTTS(text, languageCode);
                if (audioUrl) {
                    playAudioFromUrl(audioUrl);
                    return; // Successfully played cloud audio, so we're done.
                }
                console.warn(`Cloud TTS mock does not have a voice for "${text}". Falling back to browser voice.`);
            } catch (error) {
                console.error('Cloud TTS service failed:', error, 'Falling back to browser voice.');
            }
        }

        // If cloud TTS is disabled or fails, use the browser's built-in speech synthesis.
        speakWithBrowser(text, languageCode);

    }, [playAudioFromUrl, speakWithBrowser]);

    return { speakText, stop };
};