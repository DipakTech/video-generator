export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

export interface PositionedWordTiming extends WordTiming {
  x: number;
  y: number;
  size: number;
  fontStack: string;
}
