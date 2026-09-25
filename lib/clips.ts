// Shared clip model, parsing and validation. Used by both server routes and client components.

export const LED_COLORS = ["coral", "amber", "yellow", "lime", "teal", "blue", "violet", "pink"] as const;
export type LedColor = (typeof LED_COLORS)[number];

export interface Clip {
  id: string;
  name: string;
  videoId: string;
  start: number;
  end: number;
  color: LedColor;
  /** Volume trim in steps, GAIN_MIN..GAIN_MAX. 0 = default. Older clips may omit it. */
  gain?: number;
}

export const MAX_CLIP_SECONDS = 600;
export const GAIN_MIN = -5;
export const GAIN_MAX = 5;

const BASE_VOLUME = 60;
const VOLUME_PER_STEP = 8;

/** Maps a gain step to a YouTube player volume (0-100). 0 -> 60, +5 -> 100, -5 -> 20. */
export function gainToVolume(gain: number | undefined): number {
  const g = clampGain(gain ?? 0);
  return BASE_VOLUME + g * VOLUME_PER_STEP;
}

export function clampGain(gain: number): number {
  return Math.min(GAIN_MAX, Math.max(GAIN_MIN, Math.round(gain)));
}

/** "+2", "0", "-3" */
export function formatGain(gain: number | undefined): string {
  const g = gain ?? 0;
  return g > 0 ? `+${g}` : String(g);
}

function isLedColor(value: unknown): value is LedColor {
  return typeof value === "string" && (LED_COLORS as readonly string[]).includes(value);
}

/** "1:23.5" or "83.5" -> seconds. Returns NaN on bad input. */
export function parseTime(value: string): number {
  const text = String(value ?? "").trim();
  if (!text) return NaN;
  const parts = text.split(":");
  if (parts.length > 2 || parts.some((p) => p === "" || !/^\d+(\.\d+)?$/.test(p))) return NaN;
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(parts[0]);
}

/** seconds -> "m:ss", rounded to whole seconds for display. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/** Accepts full YouTube URLs (watch, youtu.be, shorts, embed, live) or a bare 11-char video id. */
export function extractVideoId(input: unknown): string | null {
  const trimmed = String(input ?? "").trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;
  if (url.hostname.endsWith("youtu.be")) {
    const id = url.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;
  const match = url.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
  return match ? match[2] : null;
}

export type ClipValidation = { ok: false; error: string } | { ok: true; clip: Clip };

export function validateClip(body: unknown, clips: Clip[], existingId?: string): ClipValidation {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const name = String(input.name ?? "").trim();
  if (!name || name.length > 40) return { ok: false, error: "Name is required (max 40 characters)." };

  const videoId = extractVideoId(input.url);
  if (!videoId) return { ok: false, error: "Could not read a YouTube video id from that URL." };

  const start = Number(input.start);
  const end = Number(input.end);
  if (!Number.isFinite(start) || start < 0) return { ok: false, error: "Start time must be 0 or more seconds." };
  if (!Number.isFinite(end) || end <= start) return { ok: false, error: "End time must be after the start time." };
  if (end - start > MAX_CLIP_SECONDS) return { ok: false, error: "Clips are capped at 10 minutes." };

  const color = isLedColor(input.color) ? input.color : LED_COLORS[clips.length % LED_COLORS.length];

  const gain = input.gain === undefined || input.gain === null || input.gain === "" ? 0 : Number(input.gain);
  if (!Number.isInteger(gain) || gain < GAIN_MIN || gain > GAIN_MAX) {
    return { ok: false, error: `Volume trim must be a whole number between ${GAIN_MIN} and ${GAIN_MAX}.` };
  }

  return {
    ok: true,
    clip: {
      id: existingId ?? crypto.randomUUID(),
      name,
      videoId,
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      color,
      gain,
    },
  };
}
