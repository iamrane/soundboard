"use client";

import { useEffect, useState } from "react";
import { formatGain, formatTime, type Clip } from "@/lib/clips";

interface Props {
  clips: Clip[];
  testingId: string | null;
  onTest: (clip: Clip) => void;
  onEdit: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
}

const miniBtn =
  "hw-btn cursor-pointer rounded-[7px] px-3 py-[7px] font-label text-[12.5px] font-semibold tracking-[0.14em] uppercase";

function ClipRow({ clip, testing, onTest, onEdit, onDelete }: { clip: Clip; testing: boolean } & Omit<Props, "clips" | "testingId">) {
  // Two-step inline confirm: first click arms the button, second click deletes.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-3.5 rounded-[10px] border border-line-soft bg-chassis-deep px-3 py-2.5 md:grid-cols-[72px_1fr_auto]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        loading="lazy"
        src={`https://i.ytimg.com/vi/${clip.videoId}/mqdefault.jpg`}
        className="h-[34px] w-[56px] rounded-md bg-black object-cover md:h-11 md:w-[72px]"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 overflow-hidden font-label text-[17px] font-bold tracking-[0.05em] text-ellipsis whitespace-nowrap uppercase">
          <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: `var(--color-led-${clip.color})` }} />
          <span className="truncate">{clip.name}</span>
        </div>
        <div className="font-lcd text-[15px] text-muted">
          {clip.videoId} · {clip.start}s → {clip.end}s ({formatTime(clip.end - clip.start)}) · vol {formatGain(clip.gain)}
        </div>
      </div>
      <div className="col-span-full flex justify-end gap-2 md:col-span-1">
        <button type="button" onClick={() => onTest(clip)} className={`${miniBtn} ${testing ? "border-led-lime text-led-lime" : "text-ink"}`}>
          {testing ? "■ Stop" : "► Test"}
        </button>
        <button type="button" onClick={() => onEdit(clip)} className={`${miniBtn} text-ink`}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => (armed ? onDelete(clip) : setArmed(true))}
          className={`${miniBtn} ${armed ? "border-led-coral bg-led-coral text-chassis-deep shadow-[0_0_12px_rgba(255,92,77,0.45)]" : "text-led-coral"}`}
        >
          {armed ? "Sure?" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function ClipList({ clips, testingId, onTest, onEdit, onDelete }: Props) {
  return (
    <section className="panel-card mt-[26px] rounded-2xl p-5">
      <h2 className="mb-4 font-label text-base font-bold tracking-[0.22em] text-muted uppercase">Clips on the board</h2>
      {clips.length === 0 ? (
        <div className="px-1 py-3 text-muted">No clips yet. Add the first one above — everyone on the board sees it immediately.</div>
      ) : (
        <div className="mt-1 flex flex-col gap-2.5">
          {clips.map((clip) => (
            <ClipRow key={clip.id} clip={clip} testing={testingId === clip.id} onTest={onTest} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
