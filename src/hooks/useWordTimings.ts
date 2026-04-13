import { WordTiming } from '../types/timing';

export interface BuiltWordTimings {
  timings: WordTiming[];
  totalDuration: number;
}

export function buildWordTimings(body: string, rate = 1.0): BuiltWordTimings {
  const tokens = tokenize(body);

  let t = 0.3;
  const timings = tokens.map((word): WordTiming => {
    const clean = word.replace(/[^\u0900-\u097Fa-zA-Z0-9]/g, '');
    const isDev = isDevanagari(word);

    const matras = countMatras(word);
    const baseDur = isDev
      ? Math.max(0.22, (matras * 85) / 1000 / rate)
      : Math.max(0.18, (clean.length * 65) / 1000 / rate);

    const hasPause = /[।\.!\?•]/.test(word);
    const gap = (hasPause ? 0.32 : 0.08) / rate;

    const start = t;
    t += baseDur + gap;

    return {
      word,
      startTime: start,
      endTime: start + baseDur,
    };
  });

  const totalDuration = t + 0.6;
  return { timings, totalDuration };
}

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function isDevanagari(word: string): boolean {
  return /[\u0900-\u097F]/.test(word);
}

function countMatras(word: string): number {
  const consonants = (word.match(/[\u0915-\u0939\u0958-\u095F]/g) || []).length;
  const matras = (word.match(/[\u093E-\u094F\u0955-\u0957]/g) || []).length;
  return Math.max(1, consonants + matras);
}
