import { useCallback, useRef, useState } from 'react';

import { Button } from './ui/button';
import { Card } from './ui/card';

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/flac'];
const ACCEPTED_EXT = '.mp3,.wav,.ogg,.m4a,.aac,.flac';

interface AudioUploadProps {
  audioFile: File | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  loading: boolean;
}

export default function AudioUpload({ audioFile, onFileSelected, onRemove, loading }: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file?: File) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
      window.alert('Please upload an audio file (MP3, WAV, OGG, M4A, AAC, FLAC)');
      return;
    }
    onFileSelected(file);
  }, [onFileSelected]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  }, [handleFile]);

  const onInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  }, [handleFile]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (audioFile) {
    return (
      <Card className="flex items-center gap-3 border-border/80 bg-card/50 p-3">
        <div className="text-primary"><WaveIcon /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{audioFile.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(audioFile.size)}</p>
        </div>
        {loading ? (
          <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
        ) : (
          <Button type="button" variant="outline" size="icon" onClick={onRemove} title="Remove audio">
            <CrossIcon />
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div
      className={`rounded-lg border border-dashed p-4 text-center transition ${dragOver ? 'border-primary bg-primary/10' : 'border-border bg-card/40 hover:bg-card/60'}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        onChange={onInputChange}
        className="hidden"
      />
      <div className="mx-auto mb-2 w-fit text-primary"><UploadIcon /></div>
      <p className="text-sm font-medium text-foreground">Drop audio file or click to browse</p>
      <p className="mt-1 text-xs text-muted-foreground">MP3 · WAV · OGG · M4A · AAC · FLAC</p>
    </div>
  );
}

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const WaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const CrossIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="1" y1="1" x2="11" y2="11" />
    <line x1="11" y1="1" x2="1" y2="11" />
  </svg>
);
