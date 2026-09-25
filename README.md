# Frontboard 01

A shared soundboard driven by YouTube clips. Everyone who opens the board sees the same pads; pressing a pad plays just the audio of that clip, from its start time to its end time (the video is never shown).

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and Bun. Deployed on Vercel with clips stored in Vercel Blob.

## Run it locally

```bash
bun install
vercel env pull   # writes .env.local with the Blob token, so local dev uses the live clip store
bun run dev
```

- Board: http://localhost:3000
- Admin: http://localhost:3000/admin

Without `vercel env pull` (no `BLOB_READ_WRITE_TOKEN`), clips are stored in a local `data/clips.json` instead, created on first write.

Other scripts: `bun run build`, `bun run start`, `bun run lint`, `bun run typecheck`.

## Admin access

`/admin` and every write to the API are guarded by `proxy.ts`, using one of two env vars:

- `ADMIN_ALLOWED_IPS` — comma-separated client IPs allowed into admin, no password needed. The address is read from the platform's `x-real-ip` / `x-forwarded-for` headers, which Vercel sets and clients cannot spoof. Requests from localhost are always allowed outside Vercel, so a list in `.env.local` cannot lock you out of local dev.
- `ADMIN_PASSWORD` — HTTP Basic auth, used only when no allowlist is set.

With neither set, admin is open locally and refused on Vercel. Route handlers repeat the check via `lib/auth.ts`.

Visitors outside the allowlist also don't see the Admin button. The root layout stamps `data-admin` on `<html>` after the server-side IP check, and the `admin:` Tailwind variant (defined in `app/globals.css`) shows admin-only elements, e.g. `hidden admin:inline-flex`. This is presentation only; the proxy is what enforces access.

A visitor on an IPv6-only connection presents an IPv6 address, so list both forms if needed.

## How it works

- **API** — route handlers under `app/api/clips` expose `GET/POST/PUT/DELETE`. `GET` is public, the rest require admin access. Storage is in `lib/storage.ts`: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise the local JSON file.
- **Board** (`/`) — `components/Board.tsx`. Press a pad (or keys 1–9, 0) to play its clip; press again or hit Stop/Escape to cut it. The LCD strip shows what's playing with a progress meter. The board polls the API every 8 s, so clips added in admin show up for everyone.
- **Admin** (`/admin`) — `components/AdminPanel.tsx`. Add, edit, test, and delete clips. Paste any YouTube URL (watch, youtu.be, shorts) plus a start and end time (`7`, `7.5`, or `1:23` formats), pick a pad color, and set a volume trim. The trim applies live while you test, so you can tune it by ear.
- **Playback** — `lib/use-youtube-player.ts` wraps the YouTube IFrame API in an offscreen player; `startSeconds`/`endSeconds` bound the clip and it stops automatically at the end time.
- **Styling** — Tailwind CSS 4. Design tokens (chassis, LCD and LED colors, fonts) are declared in `app/globals.css` along with a few custom utilities for the hardware look.

## Data

Clips live in a single private blob, `clips.json`, in the `soundboard-clips` Blob store (or `data/clips.json` locally). Each clip:

| Field     | Meaning                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| `id`      | UUID                                                                                         |
| `name`    | Pad label, max 40 characters                                                                 |
| `videoId` | 11-character YouTube video id                                                                |
| `start`   | Start time in seconds (one decimal)                                                          |
| `end`     | End time in seconds, at most 10 minutes after `start`                                        |
| `color`   | One of `coral`, `amber`, `yellow`, `lime`, `teal`, `blue`, `violet`, `pink`                  |
| `gain`    | Volume trim step, -5 to +5. Maps linearly to player volume 20–100, with 0 = 60. Missing = 0. |

The YouTube player caps at volume 100, so +5 is as loud as a clip can go; the trim is for pulling loud clips down to match quiet ones. The mapping is one function in `lib/clips.ts`.

## Deployment

The Vercel project `soundboard` is connected to this GitHub repo. Every push to `main` deploys to production; other branches get preview deployments.

Configuration was done with the Vercel CLI and lives in the project, not the repo:

- `vercel blob create-store soundboard-clips --access private --region fra1` created the store and injected `BLOB_READ_WRITE_TOKEN` into all environments.
- `vercel env add ADMIN_ALLOWED_IPS production` (and `preview`) set the allowlist. Update it with `vercel env rm` followed by `vercel env add`.
- `vercel.json` pins the framework preset to Next.js.

Useful commands: `vercel ls` (deployments), `vercel env ls` (variables), `vercel logs <url>` (runtime logs).
