import { useCallback, useRef } from 'react';

interface SpeakOptions {
  text: string;
  rate?: number;
  pitch?: number;
  onEnd?: (event: SpeechSynthesisEvent) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

interface TTSPlayer {
  speak: (options: SpeakOptions) => SpeechSynthesisUtterance;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export function useTTSPlayer(): TTSPlayer {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synth = window.speechSynthesis;

  const getNepaliVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = synth.getVoices();
    return voices.find((voice) => voice.lang === 'ne-NP')
      || voices.find((voice) => voice.lang.startsWith('ne'))
      || null;
  }, [synth]);

  const speak = useCallback(({
    text,
    rate = 1,
    pitch = 1,
    onEnd,
    onBoundary,
  }: SpeakOptions): SpeechSynthesisUtterance => {
    if (synth.speaking || synth.paused) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const nepVoice = getNepaliVoice();
    if (nepVoice) utterance.voice = nepVoice;
    if (onEnd) utterance.onend = onEnd;
    if (onBoundary) utterance.onboundary = onBoundary;

    utterRef.current = utterance;
    synth.speak(utterance);
    return utterance;
  }, [synth, getNepaliVoice]);

  const pause = useCallback((): void => {
    if (synth.speaking) synth.pause();
  }, [synth]);

  const resume = useCallback((): void => {
    if (synth.paused) synth.resume();
  }, [synth]);

  const cancel = useCallback((): void => {
    synth.cancel();
    utterRef.current = null;
  }, [synth]);

  return { speak, pause, resume, cancel };
}
