const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4040;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'clips.json');

const LED_COLORS = ['coral', 'amber', 'yellow', 'lime', 'teal', 'blue', 'violet', 'pink'];

function loadClips() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveClips(clips) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(clips, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// Accepts full YouTube URLs (watch, youtu.be, shorts, embed) or a bare 11-char video id.
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

function validateClip(body, clips, existingId) {
  const name = String(body.name || '').trim();
  if (!name || name.length > 40) return { error: 'Name is required (max 40 characters).' };

  const videoId = extractVideoId(body.url);
  if (!videoId) return { error: 'Could not read a YouTube video id from that URL.' };

  const start = Number(body.start);
  const end = Number(body.end);
  if (!Number.isFinite(start) || start < 0) return { error: 'Start time must be 0 or more seconds.' };
  if (!Number.isFinite(end) || end <= start) return { error: 'End time must be after the start time.' };
  if (end - start > 600) return { error: 'Clips are capped at 10 minutes.' };

  const color = LED_COLORS.includes(body.color) ? body.color : LED_COLORS[clips.length % LED_COLORS.length];

  return {
    clip: {
      id: existingId || crypto.randomUUID(),
      name,
      videoId,
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      color,
    },
  };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/clips', (req, res) => {
  res.json(loadClips());
});

app.post('/api/clips', (req, res) => {
  const clips = loadClips();
  const result = validateClip(req.body, clips);
  if (result.error) return res.status(400).json({ error: result.error });
  clips.push(result.clip);
  saveClips(clips);
  res.status(201).json(result.clip);
});

app.put('/api/clips/:id', (req, res) => {
  const clips = loadClips();
  const index = clips.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Clip not found.' });
  const result = validateClip(req.body, clips, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  clips[index] = result.clip;
  saveClips(clips);
  res.json(result.clip);
});

app.delete('/api/clips/:id', (req, res) => {
  const clips = loadClips();
  const next = clips.filter((c) => c.id !== req.params.id);
  if (next.length === clips.length) return res.status(404).json({ error: 'Clip not found.' });
  saveClips(next);
  res.status(204).end();
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Soundboard running on http://localhost:${PORT}`);
});
