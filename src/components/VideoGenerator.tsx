import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_FONT_SIZE_BY_RESOLUTION,
  GOOGLE_FONTS_URL,
} from "./ControlPanel";
import { PreviewCanvasHandle } from "./PreviewCanvas";
import VideoGeneratorHeader from "./video-generator/VideoGeneratorHeader";
import VideoGeneratorWorkspace from "./video-generator/VideoGeneratorWorkspace";
import { buildWordTimings } from "../hooks/useWordTimings";
import { buildAlignedTimings } from "../hooks/useTimingAlign";
import { computeScrollY, drawFrame, layoutWords, LayoutResult } from "../hooks/canvasRenderer";
import { useAudioSync } from "../hooks/useAudioSync";
import { useGeminiTTS } from "../hooks/useGeminiTTS";
import { useTTSPlayer } from "../hooks/useTTSPlayer";
import { PositionedWordTiming, WordTiming } from "../types/timing";
import { AudioMode, VideoConfig } from "../types/video";
import { loadStoredApiKey } from "./GeminiKeyInput";

const DEFAULT_CONFIG: VideoConfig = {
  brand: "oneclickresult",
  body: "आजको नेप्सेमा ८३.३३ अंकको वृद्धि भएको छ, जसमा जीवन बिमा र निर्जीवन बिमाको शेयर मूल्यमा महत्वपूर्ण सुधार देखिएको छ। • अर्थमन्त्री डा. स्वर्णिम वाग्लेले लगानीकर्ता हितमा नीतिगत सुधार गर्ने प्रतिबद्धता जनाएपछि बजारमा सकारात्मक प्रभाव परेको छ।",
  rate: 0.85,
  pitch: 1,
  animMode: "highlight",
  bgColor: "#1a0a2e",
  accentColor: "#d4b8f0",
  fontSize: DEFAULT_FONT_SIZE_BY_RESOLUTION["1280x720"],
  resolution: "1280x720",
  fontFamily: "Noto Sans Devanagari",
};

function parseResolution(res: string): { w: number; h: number } {
  const [w, h] = res.split("x").map(Number);
  return { w: w || 1280, h: h || 720 };
}

function scaledFontSize(base: number, resolution: string): number {
  const { w } = parseResolution(resolution);
  return Math.round(base * (w / 1280));
}

function fmtDur(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

let fontsInjected = false;
function ensureFonts(): void {
  if (fontsInjected) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
  fontsInjected = true;
}

export default function VideoGenerator() {
  const debounceTimerRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const [config, setConfig] = useState<VideoConfig>(DEFAULT_CONFIG);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [audioMode, setAudioMode] = useState<AudioMode>("tts");
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() =>
    loadStoredApiKey(),
  );
  const [geminiVoice, setGeminiVoice] = useState("Kore");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const [generated, setGenerated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [status, setStatus] = useState(
    "Configure your bulletin and click Generate",
  );

  const canvasRef = useRef<PreviewCanvasHandle | null>(null);
  const timingsRef = useRef<PositionedWordTiming[]>([]);
  const totalTextHRef = useRef(0);
  const isTeleprompterRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pauseAtRef = useRef(0);
  const audioModeRef = useRef<AudioMode>(audioMode);
  useEffect(() => {
    audioModeRef.current = audioMode;
  }, [audioMode]);

  const tts = useTTSPlayer();
  const audioSync = useAudioSync();
  const { generateSpeech } = useGeminiTTS();

  const getCanvas = useCallback(
    (): HTMLCanvasElement | null => canvasRef.current?.getCanvas() ?? null,
    [],
  );

  useEffect(() => ensureFonts(), []);

  const stopAnimLoop = useCallback((): void => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const redraw = useCallback(
    (t: number): void => {
      const canvas = getCanvas();
      if (!canvas || !timingsRef.current.length) return;
      const cfg = configRef.current;
      const { w, h } = parseResolution(cfg.resolution);
      const scrollY = computeScrollY(
        timingsRef.current,
        t,
        h,
        totalTextHRef.current,
      );
      drawFrame(
        canvas,
        timingsRef.current,
        {
          w,
          h,
          bgColor: cfg.bgColor,
          accentColor: cfg.accentColor,
          brand: cfg.brand,
          animMode: cfg.animMode,
          fontFamily: cfg.fontFamily,
        },
        t,
        scrollY,
      );
    },
    [getCanvas],
  );

  const layoutAndDraw = useCallback(
    (cfg: VideoConfig, timings: WordTiming[], dur: number): void => {
      const canvas = getCanvas();
      if (!canvas) return;
      const { w, h } = parseResolution(cfg.resolution);
      canvas.width = w;
      canvas.height = h;

      const fontSize = scaledFontSize(cfg.fontSize, cfg.resolution);
      const result: LayoutResult = layoutWords(canvas, timings, {
        w,
        h,
        bodySize: fontSize,
        fontFamily: cfg.fontFamily,
        lineHeightMult: 1.88,
        padFraction: 0.07,
      });

      timingsRef.current = result.words;
      totalTextHRef.current = result.totalTextH;
      // Detect overflow: 14% of canvas is header, rest is body
      const headerH = h * 0.14;
      isTeleprompterRef.current = result.totalTextH > (h - headerH);
      setTotalDuration(dur);
      setCurrentTime(0);
      pauseAtRef.current = 0;
      setGenerated(true);

      drawFrame(
        canvas,
        result.words,
        {
          w,
          h,
          bgColor: cfg.bgColor,
          accentColor: cfg.accentColor,
          brand: cfg.brand,
          animMode: cfg.animMode,
          fontFamily: cfg.fontFamily,
        },
        0,
        0,
      );
    },
    [getCanvas],
  );

  const generate = useCallback(
    async (cfg = configRef.current): Promise<void> => {
      setIsGenerating(true);
      try {
        stopAnimLoop();
        tts.cancel();
        audioSync.stop();
        setPlaying(false);
        setGeminiError("");

        if (audioMode === "upload") {
          if (audioDuration === 0) {
            setStatus("Please upload an audio file first");
            return;
          }
          const timings = buildAlignedTimings(cfg.body, audioDuration);
          layoutAndDraw(cfg, timings, audioDuration);
          const tpNote = isTeleprompterRef.current ? ' 📜 Teleprompter' : '';
          setStatus(
            `Ready - ${timingsRef.current.length} words synced to ${fmtDur(audioDuration)} audio${tpNote}`,
          );
          return;
        }

        if (audioMode === "gemini") {
          if (!geminiApiKey.trim()) {
            setStatus("Please enter your Gemini API key");
            return;
          }
          setGeminiLoading(true);
          setStatus("Generating speech via Gemini 2.5 Flash...");
          try {
            const { audioBuffer, timings, duration } = await generateSpeech({
              text: cfg.body,
              apiKey: geminiApiKey,
              voiceName: geminiVoice,
            });
            audioSync.loadBuffer(audioBuffer);
            layoutAndDraw(cfg, timings, duration);
            const tpNoteG = isTeleprompterRef.current ? ' 📜 Teleprompter' : '';
            setStatus(
              `Gemini TTS ready - ${timings.length} words - ${fmtDur(duration)}${tpNoteG}`,
            );
          } catch (error: unknown) {
            setGeminiError(
              error instanceof Error ? error.message : "Gemini TTS failed",
            );
            setStatus("Gemini TTS error - check API key and quota");
          } finally {
            setGeminiLoading(false);
          }
          return;
        }

        const { timings, totalDuration: dur } = buildWordTimings(
          cfg.body,
          cfg.rate,
        );
        layoutAndDraw(cfg, timings, dur);
        const teleprompterNote = isTeleprompterRef.current ? ' 📜 Teleprompter' : '';
        setStatus(`Ready - ${timings.length} words - ~${dur.toFixed(1)}s${teleprompterNote}`);
      } finally {
        setIsGenerating(false);
      }
    },
    [
      audioDuration,
      audioMode,
      audioSync,
      geminiApiKey,
      geminiVoice,
      generateSpeech,
      layoutAndDraw,
      stopAnimLoop,
      tts,
    ],
  );

  useEffect(() => {
    if (!generated) return;
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void generate(config);
    }, 220);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [config.resolution, config.fontSize, config.rate, config.fontFamily]);

  useEffect(() => {
    if (!generated || !timingsRef.current.length) return;
    redraw(pauseAtRef.current);
  }, [config.bgColor, config.accentColor, config.brand, config.animMode]);

  useEffect(() => {
    if (audioMode === "upload" && audioDuration > 0 && config.body) {
      void generate(config);
    }
  }, [audioDuration]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleAudioFileSelected = useCallback(
    async (file: File): Promise<void> => {
      setAudioFile(file);
      setAudioLoading(true);
      setStatus("Decoding audio...");
      try {
        const dur = await audioSync.loadFile(file);
        setAudioDuration(dur);
        setStatus(`Audio loaded - ${fmtDur(dur)}`);
      } catch {
        setStatus("Failed to decode audio. Try a different format.");
        setAudioFile(null);
      } finally {
        setAudioLoading(false);
      }
    },
    [audioSync],
  );

  const handleAudioFileRemove = useCallback((): void => {
    audioSync.dispose();
    setAudioFile(null);
    setAudioDuration(0);
    setStatus("Audio removed");
  }, [audioSync]);

  const handleAudioModeChange = useCallback(
    (mode: AudioMode): void => {
      stopAnimLoop();
      tts.cancel();
      audioSync.stop();
      setPlaying(false);
      pauseAtRef.current = 0;
      setCurrentTime(0);
      setAudioMode(mode);
      setGenerated(false);
      setGeminiError("");
      setStatus("Mode switched - click Generate");
    },
    [audioSync, stopAnimLoop, tts],
  );

  const startAnimLoop = useCallback(
    (getTime: () => number, dur: number): void => {
      const canvas = getCanvas();
      if (!canvas) return;

      const loop = () => {
        const t = getTime();
        redraw(t);
        setCurrentTime(Math.min(t, dur));
        if (t < dur + 0.5) {
          rafRef.current = requestAnimationFrame(loop);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [getCanvas, redraw],
  );

  const startPlayback = useCallback(
    (offset = 0): void => {
      if (!generated) return;
      setPlaying(true);
      setStatus("Playing...");
      const dur = totalDuration;
      const mode = audioModeRef.current;

      if (mode === "gemini" || mode === "upload") {
        audioSync.play(offset, () => {
          setPlaying(false);
          stopAnimLoop();
          pauseAtRef.current = 0;
          setStatus("Playback complete");
        });
        startAnimLoop(() => audioSync.getCurrentTime(), dur);
        return;
      }

      const t0Ref = { current: performance.now() / 1000 - offset };

      tts.speak({
        text: configRef.current.body,
        rate: configRef.current.rate,
        pitch: configRef.current.pitch,
        onStart: () => {
          // Capture t0 exactly when speech begins (avoids the SpeechSynthesis queue delay)
          t0Ref.current = performance.now() / 1000 - offset;
          startAnimLoop(() => performance.now() / 1000 - t0Ref.current, dur);
        },
        onEnd: () => {
          setPlaying(false);
          stopAnimLoop();
          setStatus("Playback complete");
        },
      });
    },
    [audioSync, generated, startAnimLoop, stopAnimLoop, totalDuration, tts],
  );

  const pausePlayback = useCallback((): void => {
    const mode = audioModeRef.current;
    if (mode === "gemini" || mode === "upload") {
      audioSync.pause();
      pauseAtRef.current = audioSync.pauseOffset;
    } else {
      tts.pause();
      pauseAtRef.current = currentTime;
    }
    stopAnimLoop();
    setPlaying(false);
    setStatus("Paused");
  }, [audioSync, currentTime, stopAnimLoop, tts]);

  const stopPlayback = useCallback((): void => {
    tts.cancel();
    audioSync.stop();
    stopAnimLoop();
    setPlaying(false);
    pauseAtRef.current = 0;
    setCurrentTime(0);
    setStatus("Stopped");
    redraw(0);
  }, [audioSync, redraw, stopAnimLoop, tts]);

  const handlePlay = useCallback((): void => {
    if (playing) {
      pausePlayback();
    } else {
      startPlayback(pauseAtRef.current);
    }
  }, [pausePlayback, playing, startPlayback]);

  const handleSeek = useCallback(
    (time: number): void => {
      stopPlayback();
      pauseAtRef.current = time;
      setCurrentTime(time);
      redraw(time);
      setStatus(`Seeked to ${time.toFixed(1)}s`);
    },
    [redraw, stopPlayback],
  );

  const handleRecord = useCallback(async (): Promise<void> => {
    if (!generated) return;
    stopPlayback();
    setRecording(true);
    setStatus("Recording... plays in real-time, please wait");

    const canvas = getCanvas();
    if (!canvas) return;

    const dur = totalDuration;
    const mode = audioModeRef.current;
    const canvasStream = canvas.captureStream(60);

    if (mode === "gemini" || mode === "upload") {
      const audioStream = audioSync.getStream();
      if (audioStream) {
        audioStream
          .getAudioTracks()
          .forEach((track) => canvasStream.addTrack(track));
      }
    }

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mime =
      mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: mime,
      videoBitsPerSecond: 8_000_000,
    });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size > 0) chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nepse_bulletin.${ext}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setRecording(false);
      setPlaying(false);
      setStatus(
        `Downloaded nepse_bulletin.${ext}${ext === "webm" ? " - convert to MP4 with ffmpeg" : ""}`,
      );
    };

    mediaRecorder.start(100);
    const t0Wall = performance.now() / 1000;

    if (mode === "gemini" || mode === "upload") {
      audioSync.play(0, () => {
        stopAnimLoop();
        setTimeout(() => mediaRecorder.stop(), 600);
      });
      startAnimLoop(() => audioSync.getCurrentTime(), dur);
      return;
    }

    tts.speak({
      text: configRef.current.body,
      rate: configRef.current.rate,
      pitch: configRef.current.pitch,
      onEnd: () => {
        stopAnimLoop();
        setTimeout(() => mediaRecorder.stop(), 700);
      },
    });
    startAnimLoop(() => performance.now() / 1000 - t0Wall, dur);
  }, [
    audioSync,
    generated,
    getCanvas,
    startAnimLoop,
    stopAnimLoop,
    stopPlayback,
    totalDuration,
    tts,
  ]);

  const { w, h } = parseResolution(config.resolution);
  const modePillLabel =
    audioMode === "gemini"
      ? "Gemini TTS"
      : audioMode === "upload"
        ? "Upload Audio"
        : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/40 p-4 text-foreground">
      <VideoGeneratorHeader
        modePillLabel={modePillLabel}
        isGenerating={isGenerating}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        onGenerate={() => void generate(config)}
      />

      <VideoGeneratorWorkspace
        config={config}
        setConfig={setConfig}
        audioMode={audioMode}
        handleAudioModeChange={handleAudioModeChange}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        geminiVoice={geminiVoice}
        setGeminiVoice={setGeminiVoice}
        geminiLoading={geminiLoading}
        geminiError={geminiError}
        audioFile={audioFile}
        handleAudioFileSelected={handleAudioFileSelected}
        handleAudioFileRemove={handleAudioFileRemove}
        audioLoading={audioLoading}
        audioDuration={audioDuration}
        isGenerating={isGenerating}
        canvasRef={canvasRef}
        canvasWidth={w}
        canvasHeight={h}
        playing={playing}
        currentTime={currentTime}
        totalDuration={totalDuration}
        status={status}
        generated={generated}
        recording={recording}
        handlePlay={handlePlay}
        pausePlayback={pausePlayback}
        stopPlayback={stopPlayback}
        handleRecord={() => void handleRecord()}
        handleSeek={handleSeek}
      />
    </div>
  );
}
