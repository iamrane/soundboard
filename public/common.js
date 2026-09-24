// Shared helpers for app + admin pages.

// "1:23.5" or "83.5" -> seconds. Returns NaN on bad input.
function parseTime(value) {
  const text = String(value || '').trim();
  if (!text) return NaN;
  const parts = text.split(':');
  if (parts.length > 2 || parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) return NaN;
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(parts[0]);
}

// seconds -> "m:ss" (rounded to whole seconds for display)
function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Mirrors the server-side parser: full YouTube URLs or a bare 11-char id.
function extractVideoId(input) {
  const trimmed = String(input || '').trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;
  if (url.hostname.endsWith('youtu.be')) {
    const id = url.pathname.slice(1).split('/')[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  const v = url.searchParams.get('v');
  if (v && /^[\w-]{11}$/.test(v)) return v;
  const match = url.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
  return match ? match[2] : null;
}

// Loads the YouTube IFrame API once; calls back when ready.
function withYouTubeApi(callback) {
  if (window.YT && window.YT.Player) return callback();
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev();
    callback();
  };
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}
