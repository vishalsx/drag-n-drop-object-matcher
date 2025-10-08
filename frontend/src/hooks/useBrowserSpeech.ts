import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to interact with the browser's native Web Speech API (SpeechSynthesis).
 * It handles fetching available voices and speaking text with the best available voice for a given language.
 */
export const useBrowserSpeech = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn('Speech Synthesis not supported by this browser.');
      return;
    }

    const getVoices = () => {
      setVoices(synth.getVoices());
    };
    
    // Voices are loaded asynchronously, so we need to listen for the 'voiceschanged' event.
    getVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = getVoices;
    }
    
    return () => {
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text: string, languageCode: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }

    // Cancel any ongoing speech to prevent overlap.
    if (synth.speaking) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    
    // Find the best matching voice for the requested language.
    // 1. Exact match (e.g., 'en-US')
    let voice = voices.find(v => v.lang === languageCode);
    
    // 2. Fallback to partial match (e.g., 'en' for 'en-US')
    if (!voice) {
        const langPart = languageCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langPart));
    }

    if (voice) {
        utterance.voice = voice;
    } else if (voices.length > 0) {
        console.warn(`No native browser voice found for language: ${languageCode}. Using browser default.`);
    }

    synth.speak(utterance);
  }, [voices]);

  return { speak };
};
