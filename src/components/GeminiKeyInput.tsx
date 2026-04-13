import { useCallback, useState } from 'react';

import { Button } from './ui/button';
import { Input } from './ui/input';

const STORAGE_KEY = 'gemini_api_key';

export function loadStoredApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore storage errors
  }
}

interface GeminiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function GeminiKeyInput({ value, onChange }: GeminiKeyInputProps) {
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setSaved(false);
  }, [onChange]);

  const handleSave = useCallback(() => {
    saveApiKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [value]);

  const handleClear = useCallback(() => {
    onChange('');
    saveApiKey('');
    setSaved(false);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          placeholder="AIza..."
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => setVisible((v) => !v)} title={visible ? 'Hide key' : 'Show key'}>
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
        {value && (
          <Button type="button" variant="outline" size="icon" onClick={handleClear} title="Clear key">
            <ClearIcon />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant={saved ? 'secondary' : 'default'} onClick={handleSave} disabled={!value}>
          {saved ? 'Saved' : 'Save to browser'}
        </Button>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Get API key
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        Key is stored only in your browser localStorage and sent only to Google API.
      </p>
    </div>
  );
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="1" y1="1" x2="11" y2="11" />
    <line x1="11" y1="1" x2="1" y2="11" />
  </svg>
);
