import { WordTiming } from '../types/timing';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export function buildAlignedTimings(body: string, audioDurationSec: number): WordTiming[] {
  const tokens = tokenize(body);
  if (!tokens.length || !audioDurationSec) return [];

  const weights = tokens.map((word) => {
    const isDev = isDevanagari(word);
    const clean = word.replace(/[^\u0900-\u097Fa-zA-Z0-9]/g, '');
    const matras = countMatras(word);

    let weight = isDev ? Math.max(1, matras) : Math.max(1, clean.length * 0.6);

    if (/[।\.!\?•,]/.test(word)) weight += 0.8;

    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const leadIn = Math.min(0.25, audioDurationSec * 0.02);
  const leadOut = Math.min(0.4, audioDurationSec * 0.03);
  const usable = audioDurationSec - leadIn - leadOut;

  let cursor = leadIn;

  return tokens.map((word, i): WordTiming => {
    const weight = weights[i] ?? 1;
    const dur = (weight / totalWeight) * usable;
    const start = cursor;
    cursor += dur;

    return {
      word,
      startTime: start,
      endTime: start + dur * 0.88,
    };
  });
}

export function fromWhisperTimestamps(whisperWords: WhisperWord[]): WordTiming[] {
  return whisperWords.map((word) => ({
    word: word.word.trim(),
    startTime: word.start,
    endTime: word.end,
  }));
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
