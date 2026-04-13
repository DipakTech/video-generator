import AudioUpload from './AudioUpload';
import GeminiKeyInput from './GeminiKeyInput';
import { GEMINI_VOICES } from '../hooks/useGeminiTTS';
import { AudioMode, AnimMode, Resolution, VideoConfig } from '../types/video';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

const ANIM_MODES: Array<{ id: AnimMode; label: string }> = [
  { id: 'highlight', label: 'Highlight' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'fade', label: 'Fade in' },
  { id: 'glow', label: 'Glow' },
];

const RESOLUTIONS: Array<{ value: Resolution; label: string }> = [
  { value: '1280x720', label: '1280x720 HD 16:9' },
  { value: '1920x1080', label: '1920x1080 Full HD' },
  { value: '1080x1080', label: '1080x1080 Square' },
  { value: '1080x1920', label: '1080x1920 Reel 9:16' },
];

export const DEFAULT_FONT_SIZE_BY_RESOLUTION: Record<Resolution, number> = {
  '1280x720': 38,
  '1920x1080': 56,
  '1080x1080': 44,
  '1080x1920': 48,
};

export const FONT_OPTIONS = [
  { id: 'Noto Sans Devanagari', label: 'Noto Sans Devanagari', note: 'Default' },
  { id: 'Mukta', label: 'Mukta', note: 'Clean Devanagari' },
  { id: 'Tiro Devanagari', label: 'Tiro Devanagari', note: 'Serif Devanagari' },
  { id: 'Baloo 2', label: 'Baloo 2', note: 'Rounded' },
  { id: 'Yatra One', label: 'Yatra One', note: 'Bold display' },
  { id: 'Hind', label: 'Hind', note: 'Neutral' },
  { id: 'Poppins', label: 'Poppins', note: 'Modern' },
  { id: 'Oswald', label: 'Oswald', note: 'Condensed' },
  { id: 'Merriweather', label: 'Merriweather', note: 'Serif' },
];

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wdth,wght@100,400;100,700&' +
  'family=Mukta:wght@400;700&family=Tiro+Devanagari&family=Baloo+2:wght@400;700&' +
  'family=Yatra+One&family=Hind:wght@400;700&family=Poppins:wght@400;700&' +
  'family=Oswald:wght@400;700&family=Merriweather:wght@400;700&display=swap';

interface ControlPanelProps {
  config: VideoConfig;
  onChange: (config: VideoConfig) => void;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  geminiApiKey: string;
  onGeminiApiKeyChange: (value: string) => void;
  geminiVoice: string;
  onGeminiVoiceChange: (value: string) => void;
  geminiLoading: boolean;
  geminiError: string;
  audioFile: File | null;
  onAudioFileSelected: (file: File) => void;
  onAudioFileRemove: () => void;
  audioLoading: boolean;
  audioDuration: number;
}

export default function ControlPanel({
  config,
  onChange,
  audioMode,
  onAudioModeChange,
  geminiApiKey,
  onGeminiApiKeyChange,
  geminiVoice,
  onGeminiVoiceChange,
  geminiLoading,
  geminiError,
  audioFile,
  onAudioFileSelected,
  onAudioFileRemove,
  audioLoading,
  audioDuration,
}: ControlPanelProps) {
  const set = <K extends keyof VideoConfig>(key: K, value: VideoConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const applyResolutionPreset = (resolution: Resolution) => {
    onChange({
      ...config,
      resolution,
      fontSize: DEFAULT_FONT_SIZE_BY_RESOLUTION[resolution],
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="brand">Channel name</Label>
          <Input id="brand" value={config.brand} onChange={(e) => set('brand', e.target.value)} placeholder="oneclickresult" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Content</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="body">Body text</Label>
          <Textarea id="body" value={config.body} onChange={(e) => set('body', e.target.value)} rows={6} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Audio source</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={audioMode} onValueChange={(value) => onAudioModeChange(value as AudioMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tts">Browser TTS</TabsTrigger>
              <TabsTrigger value="gemini">Gemini AI</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="tts" className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Speed</Label><span className="text-xs text-muted-foreground">{config.rate.toFixed(2)}x</span></div>
                <Slider min={0.5} max={1.8} step={0.05} value={[config.rate]} onValueChange={(v) => set('rate', v[0] ?? config.rate)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Pitch</Label><span className="text-xs text-muted-foreground">{config.pitch.toFixed(2)}</span></div>
                <Slider min={0.5} max={2} step={0.05} value={[config.pitch]} onValueChange={(v) => set('pitch', v[0] ?? config.pitch)} />
              </div>
            </TabsContent>

            <TabsContent value="gemini" className="space-y-3">
              <div className="space-y-2"><Label>API key</Label><GeminiKeyInput value={geminiApiKey} onChange={onGeminiApiKeyChange} /></div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={geminiVoice} onValueChange={onGeminiVoiceChange}>
                  <SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger>
                  <SelectContent>
                    {GEMINI_VOICES.map((voice) => (<SelectItem key={voice.id} value={voice.id}>{voice.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {geminiLoading && <Badge variant="secondary">Generating speech via Gemini...</Badge>}
              {geminiError && <p className="rounded-md border border-destructive/60 bg-destructive/10 p-2 text-sm text-destructive">{geminiError}</p>}
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <AudioUpload audioFile={audioFile} onFileSelected={onAudioFileSelected} onRemove={onAudioFileRemove} loading={audioLoading} />
              {audioDuration > 0 && <Badge variant="secondary">Duration: {fmtDur(audioDuration)}</Badge>}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Font & animation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={config.fontFamily} onValueChange={(value) => set('fontFamily', value)}>
            <SelectTrigger><SelectValue placeholder="Select font" /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (<SelectItem key={font.id} value={font.id}>{font.label} - {font.note}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {ANIM_MODES.map((mode) => (
              <Button key={mode.id} type="button" variant={config.animMode === mode.id ? 'default' : 'outline'} size="sm" onClick={() => set('animMode', mode.id)}>
                {mode.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance & export</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background</Label>
              <Input id="bg-color" type="color" value={config.bgColor} onChange={(e) => set('bgColor', e.target.value)} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Highlight</Label>
              <Input id="accent-color" type="color" value={config.accentColor} onChange={(e) => set('accentColor', e.target.value)} className="h-10 p-1" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Text size</Label><span className="text-xs text-muted-foreground">{config.fontSize}</span></div>
            <Slider min={18} max={56} step={1} value={[config.fontSize]} onValueChange={(v) => set('fontSize', v[0] ?? config.fontSize)} />
          </div>

          <div className="grid gap-2">
            {RESOLUTIONS.map((res) => (
              <Button key={res.value} type="button" variant={config.resolution === res.value ? 'default' : 'outline'} onClick={() => applyResolutionPreset(res.value)} className="justify-start">
                {res.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function fmtDur(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
