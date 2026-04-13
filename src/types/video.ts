export type AudioMode = 'tts' | 'gemini' | 'upload';

export type AnimMode = 'highlight' | 'typewriter' | 'bounce' | 'fade' | 'glow';

export type Resolution = '1280x720' | '1920x1080' | '1080x1080' | '1080x1920';

export interface VideoConfig {
  brand: string;
  body: string;
  rate: number;
  pitch: number;
  animMode: AnimMode;
  bgColor: string;
  accentColor: string;
  fontSize: number;
  resolution: Resolution;
  fontFamily: string;
}
