import { NextResponse } from "next/server";
import { validateClip } from "@/lib/clips";
import { requireAdmin } from "@/lib/auth";
import { loadClips, saveClips } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadClips(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const clips = await loadClips();
  const result = validateClip(body, clips);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  clips.push(result.clip);
  await saveClips(clips);
  return NextResponse.json(result.clip, { status: 201 });
}
