import { useCallback } from 'react';
import { buildAlignedTimings } from './useTimingAlign';
import { WordTiming } from '../types/timing';

interface GeminiVoice {
  id: string;
  label: string;
}

interface GenerateSpeechInput {
  text: string;
  apiKey: string;
  voiceName?: string;
}

interface GenerateSpeechResult {
  audioBuffer: AudioBuffer;
  timings: WordTiming[];
  duration: number;
}

interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: 'Kore', label: 'Kore — Firm (neutral)' },
  { id: 'Charon', label: 'Charon — Informational' },
  { id: 'Fenrir', label: 'Fenrir — Excitable' },
  { id: 'Aoede', label: 'Aoede — Breezy' },
  { id: 'Puck', label: 'Puck — Upbeat' },
  { id: 'Leda', label: 'Leda — Youthful' },
  { id: 'Orus', label: 'Orus — Firm' },
  { id: 'Zephyr', label: 'Zephyr — Bright' },
  { id: 'Schedar', label: 'Schedar — Even' },
  { id: 'Rasalgethi', label: 'Rasalgethi — Informational' },
];

const TTS_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

const SAMPLE_RATE = 24000;
const BIT_DEPTH = 16;
const CHANNELS = 1;

export function useGeminiTTS(): {
  generateSpeech: (input: GenerateSpeechInput) => Promise<GenerateSpeechResult>;
} {
  const generateSpeech = useCallback(async ({
    text,
    apiKey,
    voiceName = 'Kore',
  }: GenerateSpeechInput): Promise<GenerateSpeechResult> => {
    if (!apiKey.trim()) throw new Error('Gemini API key is required');
    if (!text.trim()) throw new Error('Text is required');

    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    };

    const response = await fetch(`${TTS_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as GeminiTTSResponse;
      const msg = err.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API error: ${msg}`);
    }

    const data = (await response.json()) as GeminiTTSResponse;
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      throw new Error('No audio data in Gemini response. Check your API key and quota.');
    }

    const binaryStr = atob(inlineData.data);
    const pcmBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i += 1) {
      pcmBytes[i] = binaryStr.charCodeAt(i);
    }

    const audioBuffer = pcmToAudioBuffer(pcmBytes.buffer, SAMPLE_RATE, CHANNELS, BIT_DEPTH);
    const duration = audioBuffer.duration;
    const timings = buildAlignedTimings(text, duration);

    return { audioBuffer, timings, duration };
  }, []);

  return { generateSpeech };
}

function createAudioContext(): AudioContext {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    throw new Error('Web Audio API is not supported in this browser');
  }
  return new Ctx();
}

function pcmToAudioBuffer(
  arrayBuffer: ArrayBuffer,
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
): AudioBuffer {
  const audioCtx = createAudioContext();
  const bytesPerSample = bitDepth / 8;
  const numSamples = arrayBuffer.byteLength / (numChannels * bytesPerSample);

  const audioBuffer = audioCtx.createBuffer(numChannels, numSamples, sampleRate);
  const dataView = new DataView(arrayBuffer);

  for (let ch = 0; ch < numChannels; ch += 1) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < numSamples; i += 1) {
      const byteOffset = (i * numChannels + ch) * bytesPerSample;
      const sample = dataView.getInt16(byteOffset, true);
      channelData[i] = sample / 32768.0;
    }
  }

  void audioCtx.close();
  return audioBuffer;
}
