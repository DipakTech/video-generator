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
  // Wall-clock time (ctx.currentTime) when playback started for the current source
  const startedAtRef = useRef(0);
  // Audio file offset that was used when the current source started
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

  /**
   * Create and start a new AudioBufferSourceNode.
   * We resume the AudioContext first (it may be suspended by autoplay policy)
   * and only record startedAt AFTER the resume so that getCurrentTime is accurate.
   */
  const createSource = useCallback(async (offsetSec: number, onEnded?: EndCallback): Promise<AudioBufferSourceNode | null> => {
    const ctx = ensureCtx();
    const buffer = bufferRef.current;
    if (!buffer) return null;

    ensureGraph();
    const gain = gainRef.current;
    if (!gain) return null;

    // Resume suspended context (browser autoplay policy) and await it
    // so ctx.currentTime is advancing before we record startedAt.
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    source.start(0, Math.max(0, offsetSec));

    // Record timing AFTER resume so ctx.currentTime matches real wall clock
    startedAtRef.current = ctx.currentTime - offsetSec;
    offsetRef.current = offsetSec;
    sourceRef.current = source;
    playingRef.current = true;

    if (onEnded) {
      source.onended = () => {
        // Only fire if we weren't explicitly stopped (playingRef still true)
        if (playingRef.current) onEnded();
      };
    }

    return source;
  }, [ensureCtx, ensureGraph]);

  /** Stop the current source without changing offsetRef (caller manages offset). */
  const stopSource = useCallback((): void => {
    try {
      sourceRef.current?.stop();
    } catch {
      // already stopped
    }
    sourceRef.current = null;
    playingRef.current = false;
  }, []);

  const stop = useCallback((): void => {
    stopSource();
    offsetRef.current = 0;
    startedAtRef.current = 0;
  }, [stopSource]);

  const play = useCallback((offsetSec = 0, onEnded?: EndCallback): void => {
    stopSource();
    offsetRef.current = offsetSec;
    void createSource(offsetSec, onEnded);
  }, [createSource, stopSource]);

  const pause = useCallback((): void => {
    if (!playingRef.current) return;
    const ctx = ctxRef.current;
    // Snapshot the current playback position BEFORE stopping the source
    if (ctx) {
      offsetRef.current = ctx.currentTime - startedAtRef.current;
    }
    stopSource();
    // Do NOT suspend the AudioContext — resuming it is async and adds latency
  }, [stopSource]);

  const resume = useCallback((onEnded?: EndCallback): void => {
    void createSource(offsetRef.current, onEnded);
  }, [createSource]);

  const getCurrentTime = useCallback((): number => {
    const ctx = ctxRef.current;
    if (!ctx || !playingRef.current) {
      // Not playing — return the last known offset (pause position)
      return offsetRef.current;
    }
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
