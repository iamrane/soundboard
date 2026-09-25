"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Clip } from "@/lib/clips";
import { useYouTubePlayer } from "@/lib/use-youtube-player";
import Faceplate from "./Faceplate";
import HwButton from "./HwButton";
import Lcd, { type Progress } from "./Lcd";
import Pad from "./Pad";
import PlayerHost from "./PlayerHost";

const KEY_HINTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const POLL_MS = 8000;

export default function Board() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [offline, setOffline] = useState(false);
  const [current, setCurrent] = useState<Clip | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearPlayback = useCallback(() => {
    setCurrent(null);
    setProgress(null);
  }, []);

  const onError = useCallback(() => {
    clearPlayback();
    setNotice("ERR · CLIP UNAVAILABLE");
  }, [clearPlayback]);

  const { hostRef, ready, play, stop: stopPlayer, currentTime } = useYouTubePlayer({ onEnded: clearPlayback, onError });

  const stop = useCallback(() => {
    stopPlayer();
    clearPlayback();
    setNotice(null);
  }, [stopPlayer, clearPlayback]);

  const toggle = useCallback(
    (clip: Clip) => {
      if (current?.id === clip.id) return stop();
      if (!ready) {
        setNotice("AUDIO ENGINE LOADING…");
        return;
      }
      setNotice(null);
      setCurrent(clip);
      setProgress({ fraction: 0, elapsed: 0, total: clip.end - clip.start });
      play(clip);
    },
    [current, ready, play, stop],
  );

  // Progress meter while a clip plays.
  useEffect(() => {
    if (!current) return;
    const total = current.end - current.start;
    const id = setInterval(() => {
      const t = currentTime() || current.start;
      const elapsed = Math.min(Math.max(t - current.start, 0), total);
      setProgress({ fraction: total > 0 ? elapsed / total : 0, elapsed, total });
    }, 150);
    return () => clearInterval(id);
  }, [current, currentTime]);

  // Poll the shared clip list so pads added in admin show up for everyone.
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/clips", { cache: "no-store" });
        if (!res.ok || !active) return;
        const next = (await res.json()) as Clip[];
        setClips((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        setOffline(false);
      } catch {
        if (active) setOffline(true);
      }
    };
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Keys 1-9, 0 trigger pads; Escape stops.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return stop();
      const index = KEY_HINTS.indexOf(e.key);
      if (index >= 0 && clips[index]) toggle(clips[index]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clips, toggle, stop]);

  const status = current
    ? `► ${current.name}`
    : notice ?? (offline ? "ERR · SERVER OFFLINE" : ready ? `READY · ${clips.length} PADS` : "BOOTING…");

  return (
    <>
      <Faceplate
        subtitle="Shared board"
        screen={<Lcd status={status} progress={current ? progress : null} />}
        controls={
          <>
            <HwButton onClick={stop} className="before:h-2.5 before:w-2.5 before:bg-led-coral before:shadow-[0_0_6px_rgba(255,92,77,0.6)] before:content-['']">
              Stop
            </HwButton>
            <HwButton href="/admin" className="hidden admin:inline-flex">
              Admin
            </HwButton>
          </>
        }
      />

      <section aria-label="Sound pads" className="mt-[26px] grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-4">
        {clips.length === 0 ? (
          <div className="col-span-full rounded-[14px] border border-dashed border-line px-6 py-12 text-center text-muted">
            No pads on the board yet.
            <span className="hidden admin:inline">
              <br />
              Add clips in the{" "}
              <Link href="/admin" className="text-led-amber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-led-amber">
                admin panel
              </Link>{" "}
              and they show up here for everyone.
            </span>
          </div>
        ) : (
          clips.map((clip, i) => (
            <Pad
              key={clip.id}
              clip={clip}
              keyHint={KEY_HINTS[i] ?? ""}
              playing={current?.id === clip.id}
              fraction={progress?.fraction ?? 0}
              onToggle={toggle}
            />
          ))
        )}
      </section>

      <PlayerHost hostRef={hostRef} />
    </>
  );
}
