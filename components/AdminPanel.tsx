"use client";

import { useCallback, useEffect, useState } from "react";
import { extractVideoId, parseTime, type Clip } from "@/lib/clips";
import { useYouTubePlayer, type PlayableClip } from "@/lib/use-youtube-player";
import ClipForm, { EMPTY_FORM, type ClipFormValues, type FormMessage } from "./ClipForm";
import ClipList from "./ClipList";
import Faceplate from "./Faceplate";
import HwButton from "./HwButton";
import Lcd from "./Lcd";
import PlayerHost from "./PlayerHost";

const PREVIEW_ID = "__preview__";

async function fetchClips(): Promise<Clip[] | null> {
  const res = await fetch("/api/clips", { cache: "no-store" });
  return res.ok ? ((await res.json()) as Clip[]) : null;
}

type Testing = { id: string; name: string } | null;

export default function AdminPanel() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [values, setValues] = useState<ClipFormValues>(EMPTY_FORM);
  const [editing, setEditing] = useState<Clip | null>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [testing, setTesting] = useState<Testing>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onEnded = useCallback(() => setTesting(null), []);
  const onError = useCallback(() => {
    setTesting(null);
    setNotice("ERR · CLIP UNAVAILABLE");
  }, []);
  const { hostRef, ready, play, stop, setGain } = useYouTubePlayer({ onEnded, onError });

  const refresh = useCallback(async () => {
    const next = await fetchClips();
    if (next) setClips(next);
  }, []);

  useEffect(() => {
    let active = true;
    fetchClips().then((next) => {
      if (active && next) setClips(next);
    });
    return () => {
      active = false;
    };
  }, []);

  // Live volume tweak: while the form preview plays, the trim stepper drives the player.
  const previewing = testing?.id === PREVIEW_ID;
  useEffect(() => {
    if (previewing) setGain(values.gain);
  }, [previewing, values.gain, setGain]);

  const stopTest = useCallback(() => {
    stop();
    setTesting(null);
    setNotice(null);
  }, [stop]);

  const testPlay = useCallback(
    (clip: PlayableClip & { id: string; name: string }) => {
      if (testing?.id === clip.id) return stopTest();
      if (!ready) {
        setNotice("AUDIO ENGINE LOADING…");
        return;
      }
      setNotice(null);
      setTesting({ id: clip.id, name: clip.name });
      play(clip);
    },
    [testing, ready, play, stopTest],
  );

  const resetForm = () => {
    setValues(EMPTY_FORM);
    setEditing(null);
  };

  const startEdit = (clip: Clip) => {
    setEditing(clip);
    setValues({
      name: clip.name,
      url: `https://www.youtube.com/watch?v=${clip.videoId}`,
      start: String(clip.start),
      end: String(clip.end),
      color: clip.color,
      gain: clip.gain ?? 0,
    });
    setMessage(null);
    document.getElementById("f-name")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const start = parseTime(values.start);
    const end = parseTime(values.end);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setMessage({ text: "Times must be seconds (7.5) or minutes:seconds (1:23).", kind: "error" });
      return;
    }
    const payload = { name: values.name, url: values.url, start, end, color: values.color, gain: values.gain };
    const res = await fetch(editing ? `/api/clips/${editing.id}` : "/api/clips", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<Clip> & { error?: string };
    if (!res.ok) {
      setMessage({ text: body.error || "Something went wrong saving the clip.", kind: "error" });
      return;
    }
    setMessage({ text: editing ? `Saved "${body.name}".` : `Added "${body.name}" to the board.`, kind: "ok" });
    resetForm();
    await refresh();
  };

  const remove = async (clip: Clip) => {
    const res = await fetch(`/api/clips/${clip.id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) {
      if (editing?.id === clip.id) resetForm();
      if (testing?.id === clip.id) stopTest();
      await refresh();
      setMessage({ text: `Deleted "${clip.name}".`, kind: "ok" });
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage({ text: body.error || `Could not delete "${clip.name}".`, kind: "error" });
    }
  };

  // Plays the form's current URL + start/end without saving anything.
  const preview = () => {
    if (testing?.id === PREVIEW_ID) return stopTest();
    const videoId = extractVideoId(values.url);
    if (!videoId) return setMessage({ text: "Enter a valid YouTube URL to test the timing.", kind: "error" });
    const start = parseTime(values.start);
    const end = parseTime(values.end);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return setMessage({ text: "Enter a start and end time (end after start) to test the timing.", kind: "error" });
    }
    setMessage(null);
    testPlay({ id: PREVIEW_ID, name: values.name.trim() || "PREVIEW", videoId, start, end, gain: values.gain });
  };

  const status = testing ? `TEST ► ${testing.name}` : notice ?? "ADMIN MODE";

  return (
    <>
      <Faceplate
        subtitle="Service panel"
        screen={<Lcd status={status} />}
        controls={<HwButton href="/">Board</HwButton>}
      />

      <ClipForm
        values={values}
        onChange={setValues}
        onSubmit={submit}
        onPreview={preview}
        onCancel={() => {
          resetForm();
          setMessage(null);
        }}
        editingName={editing?.name ?? null}
        previewing={previewing}
        message={message}
      />

      <ClipList clips={clips} testingId={testing?.id ?? null} onTest={testPlay} onEdit={startEdit} onDelete={remove} />

      <PlayerHost hostRef={hostRef} />
    </>
  );
}
