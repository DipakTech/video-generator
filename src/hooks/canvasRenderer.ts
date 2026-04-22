import { PositionedWordTiming, WordTiming } from '../types/timing';

const DEVANAGARI_FALLBACK =
  "'Noto Sans Devanagari', 'Mangal', 'Arial Unicode MS'";

interface LayoutConfig {
  w: number;
  h: number;
  bodySize: number;
  fontFamily?: string;
  lineHeightMult?: number;
  padFraction?: number;
}

interface DrawConfig {
  w: number;
  h: number;
  bgColor: string;
  accentColor: string;
  brand: string;
  fontFamily?: string;
  animMode?: 'highlight' | 'typewriter' | 'bounce' | 'fade' | 'glow';
}

export interface LayoutResult {
  words: PositionedWordTiming[];
  totalTextH: number;
}

function buildFontStack(fontFamily?: string): string {
  if (!fontFamily || fontFamily === 'default') {
    return `${DEVANAGARI_FALLBACK}, sans-serif`;
  }
  return `'${fontFamily}', ${DEVANAGARI_FALLBACK}, sans-serif`;
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is not available');
  }
  return ctx;
}

/** Height of the brand header as a fraction of canvas height */
const HEADER_H_FRACTION = 0.14;

/**
 * Layout words into absolute (virtual-document) positions.
 * Words always start at the top of the body area so that overflow text
 * can be revealed by scrolling.  Returns the positioned words AND the
 * total virtual text height so callers can detect teleprompter mode.
 */
export function layoutWords(
  canvas: HTMLCanvasElement,
  timings: WordTiming[],
  config: LayoutConfig,
): LayoutResult {
  const {
    w,
    h,
    bodySize,
    fontFamily,
    lineHeightMult = 1.88,
    padFraction = 0.07,
  } = config;

  const ctx = get2dContext(canvas);
  const fontStack = buildFontStack(fontFamily);
  const pad = w * padFraction;
  const maxW = w - pad * 2;
  const lh = bodySize * lineHeightMult;
  const headerH = h * HEADER_H_FRACTION;

  ctx.font = `${bodySize}px ${fontStack}`;

  // Word-wrap into lines
  const lines: number[][] = [];
  let line: number[] = [];
  let lineW = 0;

  timings.forEach((wt, i) => {
    const mw = ctx.measureText(`${wt.word} `).width;
    if (lineW + mw > maxW && line.length > 0) {
      lines.push(line);
      line = [];
      lineW = 0;
    }
    line.push(i);
    lineW += mw;
  });
  if (line.length) lines.push(line);

  const totalTextH = lines.length * lh;
  const availH = h - headerH;

  // If text fits: vertically centre within the available body area (legacy behaviour).
  // If text overflows: start at the top of the body area so scroll reveals the rest.
  const fitsVertically = totalTextH <= availH;
  const startY = fitsVertically
    ? headerH + (availH - totalTextH) / 2 + bodySize
    : headerH + lh * 0.5; // small top-padding when scrolling

  const laid: PositionedWordTiming[] = timings.map((wt) => ({
    ...wt,
    x: 0,
    y: 0,
    size: bodySize,
    fontStack,
  }));

  lines.forEach((ln, li) => {
    let lw = 0;
    ln.forEach((index) => {
      const item = timings[index];
      if (!item) return;
      lw += ctx.measureText(`${item.word} `).width;
    });

    let cx = (w - lw) / 2;
    ln.forEach((index) => {
      const item = timings[index];
      if (!item) return;
      const mw = ctx.measureText(`${item.word} `).width;
      laid[index] = {
        ...item,
        x: cx,
        y: startY + li * lh,
        size: bodySize,
        fontStack,
      };
      cx += mw;
    });
  });

  return { words: laid, totalTextH };
}

/**
 * Compute the scroll offset (pixels) the canvas body area should be shifted
 * upward so that the currently-spoken word is roughly centred in the viewport.
 *
 * @param timings   All positioned word timings (y values are absolute/virtual).
 * @param t         Current playback time in seconds.
 * @param h         Canvas height in pixels.
 * @param totalTextH Total virtual text height from layoutWords.
 */
export function computeScrollY(
  timings: PositionedWordTiming[],
  t: number,
  h: number,
  totalTextH: number,
): number {
  const headerH = h * HEADER_H_FRACTION;
  const availH = h - headerH;

  // If all text fits there is nothing to scroll
  if (totalTextH <= availH) return 0;

  // Find the word currently being spoken (or the last spoken word)
  let activeWord: PositionedWordTiming | null = null;
  for (const wt of timings) {
    if (t >= wt.startTime) activeWord = wt;
    if (t < wt.endTime) break;
  }

  // Fall back to first / last word
  if (!activeWord) activeWord = timings[0] ?? null;
  if (!activeWord) return 0;

  // We want the active word to appear at ~40% down the body area
  const targetYInView = availH * 0.4;
  // activeWord.y is the baseline in virtual space; shift by headerH to get body-relative
  const wordBodyY = activeWord.y - headerH;
  const rawScroll = wordBodyY - targetYInView;

  // Clamp so we never scroll past start / end
  const maxScroll = totalTextH - availH;
  return Math.max(0, Math.min(rawScroll, maxScroll));
}

/**
 * Draw a single video frame onto the canvas.
 *
 * @param canvas    Target canvas element (already sized).
 * @param timings   Positioned word timings.
 * @param config    Visual config.
 * @param t         Current playback time in seconds.
 * @param scrollY   Vertical scroll offset in pixels (0 = no scroll).
 */
export function drawFrame(
  canvas: HTMLCanvasElement,
  timings: PositionedWordTiming[],
  config: DrawConfig,
  t: number,
  scrollY = 0,
): void {
  const { w, h, bgColor, accentColor, brand, fontFamily, animMode = 'highlight' } = config;

  const ctx = get2dContext(canvas);
  const fontStack = buildFontStack(fontFamily);
  const headerH = h * HEADER_H_FRACTION;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, bgColor);

  // ── Scrollable body area ───────────────────────────────────────────────────
  ctx.save();
  // Clip to body area (below header)
  ctx.beginPath();
  ctx.rect(0, headerH, w, h - headerH);
  ctx.clip();
  // Shift content upward by scrollY
  ctx.translate(0, -scrollY);

  ctx.textBaseline = 'alphabetic';

  timings.forEach((wt) => {
    const speaking = t >= wt.startTime && t < wt.endTime;
    const spoken = t >= wt.endTime;
    const progress = speaking
      ? (t - wt.startTime) / (wt.endTime - wt.startTime)
      : spoken
        ? 1
        : 0;

    ctx.save();
    ctx.font = `${wt.size}px ${wt.fontStack || fontStack}`;

    switch (animMode) {
      case 'highlight':
        drawHighlight(ctx, wt, speaking, spoken, accentColor);
        break;
      case 'typewriter':
        drawTypewriter(ctx, wt, speaking, spoken, progress, accentColor);
        break;
      case 'bounce':
        drawBounce(ctx, wt, speaking, spoken, progress, accentColor);
        break;
      case 'fade':
        drawFade(ctx, wt, speaking, spoken, accentColor);
        break;
      case 'glow':
        drawGlow(ctx, wt, speaking, spoken, accentColor);
        break;
      default:
        drawHighlight(ctx, wt, speaking, spoken, accentColor);
    }
    ctx.restore();
  });

  ctx.restore(); // restore clip + translate

  // ── Fixed header — drawn on top after restore ──────────────────────────────
  drawHeader(ctx, w, h, brand, fontStack);

  // ── Subtle fade at top of body when scrolled ───────────────────────────────
  if (scrollY > 2) {
    const fadeH = headerH * 0.6;
    const grad = ctx.createLinearGradient(0, headerH, 0, headerH + fadeH);
    grad.addColorStop(0, bgColor + 'dd');
    grad.addColorStop(1, bgColor + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, headerH, w, fadeH);
  }
}

// ── Private drawing helpers ──────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgColor: string,
): void {
  const [r, g, b] = hexToRgb(bgColor);
  const lighter = `rgb(${clamp(r + 45)},${clamp(g + 18)},${clamp(b + 65)})`;
  const grad = ctx.createRadialGradient(
    w * 0.28,
    h * 0.22,
    0,
    w * 0.5,
    h * 0.5,
    w * 0.9,
  );
  grad.addColorStop(0, lighter);
  grad.addColorStop(1, bgColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brand: string,
  fontStack: string,
): void {
  const s = w / 1280;
  const px = w * 0.055;
  const py = h * 0.07;
  ctx.textBaseline = 'alphabetic';

  ctx.font = `${Math.round(13 * s)}px ${fontStack}`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Made by', px, py);

  ctx.font = `bold ${Math.round(17 * s)}px ${fontStack}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(brand || 'oneclickresult.com', px, py + Math.round(23 * s));
}

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  wt: PositionedWordTiming,
  speaking: boolean,
  spoken: boolean,
  accent: string,
): void {
  ctx.globalAlpha = speaking ? 1 : spoken ? 0.82 : 0.22;
  ctx.fillStyle = speaking ? accent : spoken ? '#e8dff8' : '#ffffff';
  if (speaking) {
    const mw = ctx.measureText(wt.word).width / 2;
    ctx.save();
    ctx.translate(wt.x + mw, wt.y);
    ctx.scale(1.04, 1.04);
    ctx.fillText(wt.word, -mw, 0);
    ctx.restore();
  } else {
    ctx.fillText(wt.word, wt.x, wt.y);
  }
}

function drawTypewriter(
  ctx: CanvasRenderingContext2D,
  wt: PositionedWordTiming,
  speaking: boolean,
  spoken: boolean,
  progress: number,
  accent: string,
): void {
  const visible = speaking
    ? Math.ceil(wt.word.length * progress)
    : spoken
      ? wt.word.length
      : 0;
  if (!visible) return;
  ctx.globalAlpha = spoken ? 0.85 : 1;
  ctx.fillStyle = speaking ? accent : '#e8dff8';
  ctx.fillText(wt.word.slice(0, visible), wt.x, wt.y);
}

function drawBounce(
  ctx: CanvasRenderingContext2D,
  wt: PositionedWordTiming,
  speaking: boolean,
  spoken: boolean,
  progress: number,
  accent: string,
): void {
  const dy = speaking ? -Math.sin(progress * Math.PI) * wt.size * 0.2 : 0;
  ctx.globalAlpha = speaking ? 1 : spoken ? 0.82 : 0.2;
  ctx.fillStyle = speaking ? accent : spoken ? '#e8dff8' : '#ffffff';
  ctx.fillText(wt.word, wt.x, wt.y + dy);
}

function drawFade(
  ctx: CanvasRenderingContext2D,
  wt: PositionedWordTiming,
  speaking: boolean,
  spoken: boolean,
  accent: string,
): void {
  ctx.globalAlpha = speaking ? 1 : spoken ? 0.82 : 0.1;
  ctx.fillStyle = speaking ? accent : '#e8dff8';
  ctx.fillText(wt.word, wt.x, wt.y);
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  wt: PositionedWordTiming,
  speaking: boolean,
  spoken: boolean,
  accent: string,
): void {
  if (speaking) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = wt.size * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = spoken ? '#e8dff8' : '#ffffff';
    ctx.globalAlpha = spoken ? 0.8 : 0.18;
  }
  ctx.fillText(wt.word, wt.x, wt.y);
  ctx.shadowBlur = 0;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function clamp(v: number): number {
  return Math.min(255, Math.max(0, v));
}
