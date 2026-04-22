import { useEffect, useRef, useState } from 'react';
import ControlPanel from '../ControlPanel';
import PlaybackBar from '../PlaybackBar';
import PreviewCanvas, { PreviewCanvasHandle } from '../PreviewCanvas';
import { AudioMode, VideoConfig } from '../../types/video';

interface VideoGeneratorWorkspaceProps {
  config: VideoConfig;
  setConfig: (config: VideoConfig) => void;
  audioMode: AudioMode;
  handleAudioModeChange: (mode: AudioMode) => void;
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  geminiVoice: string;
  setGeminiVoice: (value: string) => void;
  geminiLoading: boolean;
  geminiError: string;
  audioFile: File | null;
  handleAudioFileSelected: (file: File) => void;
  handleAudioFileRemove: () => void;
  audioLoading: boolean;
  audioDuration: number;
  isGenerating: boolean;
  canvasRef: React.RefObject<PreviewCanvasHandle | null>;
  canvasWidth: number;
  canvasHeight: number;
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  status: string;
  generated: boolean;
  recording: boolean;
  handlePlay: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  handleRecord: () => void;
  handleSeek: (time: number) => void;
}

export default function VideoGeneratorWorkspace({
  config,
  setConfig,
  audioMode,
  handleAudioModeChange,
  geminiApiKey,
  setGeminiApiKey,
  geminiVoice,
  setGeminiVoice,
  geminiLoading,
  geminiError,
  audioFile,
  handleAudioFileSelected,
  handleAudioFileRemove,
  audioLoading,
  audioDuration,
  isGenerating,
  canvasRef,
  canvasWidth,
  canvasHeight,
  playing,
  currentTime,
  totalDuration,
  status,
  generated,
  recording,
  handlePlay,
  pausePlayback,
  stopPlayback,
  handleRecord,
  handleSeek,
}: VideoGeneratorWorkspaceProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state with browser events (e.g. user presses Escape)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      canvasWrapperRef.current?.requestFullscreen().catch(() => {
        // Ignore: e.g. user denied or browser doesn't support
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <aside className="max-h-[calc(100vh-140px)] overflow-auto pr-1">
        <ControlPanel
          config={config}
          onChange={setConfig}
          audioMode={audioMode}
          onAudioModeChange={handleAudioModeChange}
          geminiApiKey={geminiApiKey}
          onGeminiApiKeyChange={setGeminiApiKey}
          geminiVoice={geminiVoice}
          onGeminiVoiceChange={setGeminiVoice}
          geminiLoading={geminiLoading}
          geminiError={geminiError}
          audioFile={audioFile}
          onAudioFileSelected={handleAudioFileSelected}
          onAudioFileRemove={handleAudioFileRemove}
          audioLoading={audioLoading}
          audioDuration={audioDuration}
        />
      </aside>

      <main>
        {/* Canvas wrapper — this element goes fullscreen */}
        <div ref={canvasWrapperRef} className="relative group">
          <PreviewCanvas ref={canvasRef} width={canvasWidth} height={canvasHeight} />

          {/* Fullscreen styles when browser enters fullscreen */}
          <style>{`
            :fullscreen .fullscreen-canvas-inner {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100vw;
              height: 100vh;
              background: #000;
            }
            :fullscreen .fullscreen-canvas-inner canvas {
              max-width: 100vw;
              max-height: 100vh;
              width: auto;
              height: auto;
              border-radius: 0;
            }
          `}</style>

          {/* Fullscreen toggle button — visible on hover */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className={[
              'absolute top-3 right-3 z-20',
              'flex items-center justify-center',
              'h-8 w-8 rounded-lg',
              'bg-black/50 backdrop-blur-sm',
              'border border-white/20',
              'text-white/80 hover:text-white hover:bg-black/70',
              'transition-all duration-150',
              'opacity-0 group-hover:opacity-100',
              isFullscreen ? 'opacity-100' : '',
            ].join(' ')}
          >
            {isFullscreen ? (
              /* Exit-fullscreen icon (compress) */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              /* Enter-fullscreen icon (expand) */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 7V3h4" />
                <path d="M21 7V3h-4" />
                <path d="M3 17v4h4" />
                <path d="M21 17v4h-4" />
              </svg>
            )}
          </button>

          {isGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Generating video preview...
              </div>
            </div>
          )}
        </div>

        <PlaybackBar
          playing={playing}
          currentTime={currentTime}
          totalDuration={totalDuration}
          status={status}
          generated={generated}
          recording={recording}
          onPlay={handlePlay}
          onPause={pausePlayback}
          onStop={stopPlayback}
          onRecord={handleRecord}
          onSeek={handleSeek}
        />
      </main>
    </div>
  );
}
