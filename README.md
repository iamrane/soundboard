# Soundboard 01

A shared soundboard driven by YouTube clips. Everyone who opens the board sees the same pads; pressing a pad plays just the audio of that clip, from its start time to its end time (the video is never shown).

## Run it

```bash
yarn install
yarn start
```

- Board: http://localhost:3000
- Admin: http://localhost:3000/admin

Set `PORT` to run on a different port.

## How it works

- **Server** — Express ([server.js](server.js)) serves the two pages and a small REST API (`GET/POST/PUT/DELETE /api/clips`). Clips live in `data/clips.json`, so every visitor shares the same board.
- **Board** (`/`) — a pad grid. Press a pad (or keys 1–9, 0) to play its clip; press again or hit Stop/Escape to cut it. The LCD strip shows what's playing with a progress meter. The board polls the API every 8 s, so clips added in admin show up for everyone.
- **Admin** (`/admin`) — add, edit, test, and delete clips. Paste any YouTube URL (watch, youtu.be, shorts) plus a start and end time (`7`, `7.5`, or `1:23` formats), and pick a pad color.
- **Playback** — the YouTube IFrame API with an offscreen player; `startSeconds`/`endSeconds` bound the clip and it stops automatically at the end time.

## Data

`data/clips.json` is created on first write. Each clip: `{ id, name, videoId, start, end, color }`. The repo ships with a few sample clips — delete them in the admin panel.
