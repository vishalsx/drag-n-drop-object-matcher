import { useCallback } from 'react';

const useSoundEffects = () => {
  const playSound = useCallback((type: 'correct' | 'wrong' | 'complete') => {
    if (typeof window.AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        console.warn("AudioContext not supported by this browser.");
        return;
    }
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);

    switch(type) {
      case 'correct':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'wrong':
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'complete':
        const playNote = (frequency: number, startTime: number, duration: number) => {
            gainNode.gain.cancelScheduledValues(startTime);
            gainNode.gain.setValueAtTime(0.2, startTime);
            oscillator.frequency.setValueAtTime(frequency, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
        };
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        const now = audioContext.currentTime;
        playNote(523.25, now, 0.15); // C5
        playNote(659.25, now + 0.15, 0.15); // E5
        playNote(783.99, now + 0.3, 0.15); // G5
        playNote(1046.50, now + 0.45, 0.3); // C6
        oscillator.stop(audioContext.currentTime + 0.8);
        break;
    }
  }, []);

  const playCorrectSound = useCallback(() => playSound('correct'), [playSound]);
  const playWrongSound = useCallback(() => playSound('wrong'), [playSound]);
  const playGameCompleteSound = useCallback(() => playSound('complete'), [playSound]);

  return { playCorrectSound, playWrongSound, playGameCompleteSound };
};

export default useSoundEffects;
