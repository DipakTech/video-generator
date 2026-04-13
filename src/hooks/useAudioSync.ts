import { useCallback, useRef } from 'react';

type EndCallback = (() => void) | null | undefined;

interface AudioSyncApi {
  loadFile: (file: File) => Promise<number>;
  loadBuffer: (audioBuffer: AudioBuffer) => number;
  play: (offsetSec?: number, onEnded?: EndCallback) => void;
  pause: () => void;
  resume: (onEnded?: EndCallback) => void;
  stop: () => void;
  getCurrentTime: () => number;
  getStream: () => MediaStream | null;
  dispose: () => void;
  readonly duration: number;
  readonly isPlaying: boolean;
  readonly pauseOffset: number;
}

function createAudioContext(): AudioContext {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    throw new Error('Web Audio API is not supported in this browser');
  }
  return new Ctx();
}

export function useAudioSync(): AudioSyncApi {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const playingRef = useRef(false);

  const ensureCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createAudioContext();
    }
    return ctxRef.current;
  }, []);

  const ensureGraph = useCallback((): void => {
    const ctx = ensureCtx();
    if (!gainRef.current || gainRef.current.context !== ctx) {
      const gain = ctx.createGain();
      gain.gain.value = 1;
      const destination = ctx.createMediaStreamDestination();
      gain.connect(destination);
      gain.connect(ctx.destination);
      gainRef.current = gain;
      destRef.current = destination;
    }
  }, [ensureCtx]);

  const loadFile = useCallback(async (file: File): Promise<number> => {
    ensureGraph();
    const ctx = ctxRef.current;
    if (!ctx) {
      throw new Error('Audio context is not initialized');
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferRef.current = audioBuffer;
    return audioBuffer.duration;
  }, [ensureGraph]);

  const loadBuffer = useCallback((audioBuffer: AudioBuffer): number => {
    ensureGraph();
    bufferRef.current = audioBuffer;
    return audioBuffer.duration;
  }, [ensureGraph]);

  const createSource = useCallback((offsetSec: number, onEnded?: EndCallback): AudioBufferSourceNode | null => {
    const ctx = ensureCtx();
    const buffer = bufferRef.current;
    if (!buffer) return null;

    ensureGraph();
    const gain = gainRef.current;
    if (!gain) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    if (onEnded) source.onended = onEnded;
    source.start(0, Math.max(0, offsetSec));

    startedAtRef.current = ctx.currentTime - offsetSec;
    offsetRef.current = offsetSec;
    sourceRef.current = source;
    playingRef.current = true;

    return source;
  }, [ensureCtx, ensureGraph]);

  const stop = useCallback((): void => {
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore if already stopped
    }
    sourceRef.current = null;
    playingRef.current = false;
    offsetRef.current = 0;
    startedAtRef.current = 0;

    if (ctxRef.current?.state === 'suspended') {
      void ctxRef.current.resume();
    }
  }, []);

  const play = useCallback((offsetSec = 0, onEnded?: EndCallback): void => {
    stop();
    if (ctxRef.current?.state === 'suspended') {
      void ctxRef.current.resume();
    }
    createSource(offsetSec, onEnded);
  }, [createSource, stop]);

  const pause = useCallback((): void => {
    if (!playingRef.current) return;
    const ctx = ctxRef.current;
    if (ctx) {
      offsetRef.current = ctx.currentTime - startedAtRef.current;
    }
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore if already stopped
    }
    sourceRef.current = null;
    playingRef.current = false;

    if (ctx?.state === 'running') {
      void ctx.suspend();
    }
  }, []);

  const resume = useCallback((onEnded?: EndCallback): void => {
    if (ctxRef.current?.state === 'suspended') {
      void ctxRef.current.resume();
    }
    createSource(offsetRef.current, onEnded);
  }, [createSource]);

  const getCurrentTime = useCallback((): number => {
    const ctx = ctxRef.current;
    if (!ctx || !playingRef.current) return offsetRef.current;
    return ctx.currentTime - startedAtRef.current;
  }, []);

  const getStream = useCallback((): MediaStream | null => {
    return destRef.current?.stream ?? null;
  }, []);

  const dispose = useCallback((): void => {
    stop();
    if (ctxRef.current) {
      void ctxRef.current.close();
    }
    ctxRef.current = null;
    bufferRef.current = null;
    gainRef.current = null;
    destRef.current = null;
  }, [stop]);

  return {
    loadFile,
    loadBuffer,
    play,
    pause,
    resume,
    stop,
    getCurrentTime,
    getStream,
    dispose,
    get duration() {
      return bufferRef.current?.duration ?? 0;
    },
    get isPlaying() {
      return playingRef.current;
    },
    get pauseOffset() {
      return offsetRef.current;
    },
  };
}
