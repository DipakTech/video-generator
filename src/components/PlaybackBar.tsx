import { useCallback } from 'react';

import { Button } from './ui/button';
import { Card } from './ui/card';

interface PlaybackBarProps {
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  status: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onSeek: (time: number) => void;
  recording: boolean;
  generated: boolean;
}

export default function PlaybackBar({
  playing,
  currentTime,
  totalDuration,
  status,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onSeek,
  recording,
  generated,
}: PlaybackBarProps) {
  const progress = totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : 0;
  const fmt = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    onSeek(frac * totalDuration);
  }, [onSeek, totalDuration]);

  return (
    <Card className="mt-4 border-border/70 bg-card/70 p-4">
      <div className="mb-4 cursor-pointer" onClick={handleSeek} role="presentation">
        <div className="relative h-2 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-primary/70 bg-background" style={{ left: `calc(${progress * 100}% - 8px)` }} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {playing ? (
            <Button type="button" variant="secondary" onClick={onPause}>
              <PauseIcon /> Pause
            </Button>
          ) : (
            <Button type="button" onClick={onPlay} disabled={!generated}>
              <PlayIcon /> {currentTime > 0 ? 'Resume' : 'Play'}
            </Button>
          )}

          <Button type="button" variant="outline" onClick={onStop} disabled={!generated}>
            <StopIcon /> Stop
          </Button>

          <Button type="button" variant={recording ? 'destructive' : 'secondary'} onClick={onRecord} disabled={!generated || recording}>
            <span className={`inline-block h-2 w-2 rounded-full ${recording ? 'bg-destructive-foreground' : 'bg-primary'}`} />
            {recording ? 'Recording...' : 'Record & Export'}
          </Button>
        </div>

        <span className="text-sm text-muted-foreground">{fmt(currentTime)} / {fmt(totalDuration)}</span>
      </div>

      <p className="text-sm text-muted-foreground">{status}</p>
    </Card>
  );
}

const PlayIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <polygon points="1,0.5 9.5,5 1,9.5" />
  </svg>
);

const PauseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect x="1" y="0.5" width="3" height="9" rx="0.5" />
    <rect x="6" y="0.5" width="3" height="9" rx="0.5" />
  </svg>
);

const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect x="1" y="1" width="8" height="8" rx="1" />
  </svg>
);
