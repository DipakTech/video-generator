import { useCallback, useRef } from 'react';

interface StartOptions {
  bitrate?: number;
}

interface StartResult {
  mime: string;
  recorder: MediaRecorder;
}

interface StopResult {
  blob: Blob;
  ext: 'mp4' | 'webm';
  mime: string;
}

interface VideoRecorder {
  start: (canvas: HTMLCanvasElement, options?: StartOptions) => StartResult;
  stop: () => Promise<StopResult | null>;
  downloadBlob: (blob: Blob, filename: string) => void;
}

export function useVideoRecorder(): VideoRecorder {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const getBestMimeType = (): string => {
    const candidates = [
      'video/mp4;codecs=h264,aac',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || 'video/webm';
  };

  const start = useCallback((canvas: HTMLCanvasElement, { bitrate = 8_000_000 }: StartOptions = {}): StartResult => {
    chunksRef.current = [];
    const mime = getBestMimeType();
    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: bitrate,
    });

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorderRef.current = recorder;
    recorder.start(100);

    return { mime, recorder };
  }, []);

  const stop = useCallback((): Promise<StopResult | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext: 'mp4' | 'webm' = mime.includes('mp4') ? 'mp4' : 'webm';
        resolve({ blob, ext, mime });
      };

      recorder.stop();
    });
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    if (anchor.parentNode === document.body) {
      document.body.removeChild(anchor);
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  return { start, stop, downloadBlob };
}
