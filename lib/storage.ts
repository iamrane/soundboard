// Server-only clip storage.
// On Vercel the filesystem is read-only and ephemeral, so clips live in Vercel Blob.
// Locally (no BLOB_READ_WRITE_TOKEN) they stay in data/clips.json.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Clip } from "./clips";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "clips.json");
const BLOB_PATH = process.env.BLOB_CLIPS_PATH || "clips.json";

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadClips(): Promise<Clip[]> {
  if (blobEnabled()) {
    const { get } = await import("@vercel/blob");
    const result = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!result) return [];
    return JSON.parse(await new Response(result.stream).text()) as Clip[];
  }
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Clip[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveClips(clips: Clip[]): Promise<void> {
  const json = JSON.stringify(clips, null, 2);
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, json, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, json);
  await fs.rename(tmp, DATA_FILE);
}
