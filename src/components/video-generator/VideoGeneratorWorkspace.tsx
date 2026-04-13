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
        <div className="relative">
          <PreviewCanvas ref={canvasRef} width={canvasWidth} height={canvasHeight} />
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
