import { useState, useCallback } from 'react';
import { fetchCloudTTS } from '../services/cloudTtsService';
import { useBrowserSpeech } from './useBrowserSpeech';

// Set to true to prefer high-quality cloud voices, false to use browser-only voices.
const USE_CLOUD_TTS = true;

/**
 * Custom hook to provide text-to-speech functionality.
 * It intelligently chooses between a high-quality cloud-based TTS service
 * and the browser's native Speech Synthesis API as a fallback.
 */
export const useSpeech = () => {
    const [audioPlayer] = useState(new Audio());
    const { speak: speakWithBrowser } = useBrowserSpeech();

    const playAudioFromUrl = useCallback((url: string) => {
        if (!audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        audioPlayer.src = url;
        audioPlayer.play().catch(e => console.error("Audio playback error:", e));
    }, [audioPlayer]);

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

    return speakText;
};
