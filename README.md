# Frontboard 01

A shared soundboard driven by YouTube clips. Everyone who opens the board sees the same pads; pressing a pad plays just the audio of that clip, from its start time to its end time (the video is never shown).

Built with Next.js (App Router), React, Tailwind CSS and Bun.

## Run it

```bash
bun install
bun run dev
```

- Board: http://localhost:3000
- Admin: http://localhost:3000/admin

Admin access (`/admin` and the write endpoints) is controlled by one of two env vars:

- `ADMIN_ALLOWED_IPS` — comma-separated client IPs allowed into admin, no password needed. Requests from localhost are always allowed outside Vercel, so a list in `.env.local` cannot lock you out of local dev.
- `ADMIN_PASSWORD` — HTTP Basic auth, used only when no allowlist is set.

With neither set, admin is open locally and refused on Vercel.

Other scripts: `bun run build`, `bun run start`, `bun run lint`, `bun run typecheck`.

## How it works

- **API** — route handlers under `app/api/clips` expose `GET/POST/PUT/DELETE`. Clips live in `data/clips.json` locally, or in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, so every visitor shares the same board. Storage lives in `lib/storage.ts`.
- **Auth** — `proxy.ts` guards `/admin` and every non-GET request to the API: an IP allowlist (`ADMIN_ALLOWED_IPS`, read from the platform's `x-real-ip` / `x-forwarded-for` headers) when set, otherwise HTTP Basic auth (`ADMIN_PASSWORD`). Route handlers check again via `lib/auth.ts`.
- **Board** (`/`) — `components/Board.tsx`. Press a pad (or keys 1–9, 0) to play its clip; press again or hit Stop/Escape to cut it. The LCD strip shows what's playing with a progress meter. The board polls the API every 8 s, so clips added in admin show up for everyone.
- **Admin** (`/admin`) — `components/AdminPanel.tsx`. Add, edit, test, and delete clips. Paste any YouTube URL (watch, youtu.be, shorts) plus a start and end time (`7`, `7.5`, or `1:23` formats), pick a pad color, and set a volume trim from -5 to +5 to even out loud and quiet clips. The trim applies live while you test, so you can tune it by ear.
- **Playback** — `lib/use-youtube-player.ts` wraps the YouTube IFrame API in an offscreen player; `startSeconds`/`endSeconds` bound the clip and it stops automatically at the end time.
- **Styling** — Tailwind CSS 4. Design tokens (chassis, LCD and LED colors, fonts) are declared in `app/globals.css` along with a few custom utilities for the hardware look.

## Deploy to Vercel

Vercel detects Next.js and Bun (via `bun.lock`) automatically.

1. Import the repo in Vercel.
2. Storage → create a **Blob** store and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`.
3. Settings → Environment Variables → add `ADMIN_ALLOWED_IPS`, a comma-separated list of public IPv4/IPv6 addresses allowed to reach admin. Everyone else gets a 403. A visitor on an IPv6-only connection presents an IPv6 address, so list both forms if needed. Alternatively set `ADMIN_PASSWORD` for Basic auth instead. Without either, the admin panel refuses writes on Vercel.
4. Deploy.

The board starts empty on Vercel; add clips via `/admin` (any username, the password you set). Clips are stored as a single private blob, `clips.json`.

## Data

`data/clips.json` (local) or the `clips.json` blob (Vercel) is created on first write. Each clip: `{ id, name, videoId, start, end, color, gain }`. `gain` is the volume trim step (-5..5, 0 = default, maps to player volume 20..100); clips saved before it existed are treated as 0.
