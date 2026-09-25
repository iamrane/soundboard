import { NextResponse } from "next/server";
import { validateClip } from "@/lib/clips";
import { requireAdmin } from "@/lib/auth";
import { loadClips, saveClips } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const clips = await loadClips();
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) return NextResponse.json({ error: "Clip not found." }, { status: 404 });

  const result = validateClip(body, clips, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  clips[index] = result.clip;
  await saveClips(clips);
  return NextResponse.json(result.clip);
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const clips = await loadClips();
  const next = clips.filter((c) => c.id !== id);
  if (next.length === clips.length) return NextResponse.json({ error: "Clip not found." }, { status: 404 });

  await saveClips(next);
  return new Response(null, { status: 204 });
}
