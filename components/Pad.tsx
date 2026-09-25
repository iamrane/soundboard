import type { CSSProperties } from "react";
import { formatGain, formatTime, type Clip } from "@/lib/clips";

interface Props {
  clip: Clip;
  keyHint: string;
  playing: boolean;
  /** 0..1, only meaningful while playing */
  fraction: number;
  onToggle: (clip: Clip) => void;
}

export default function Pad({ clip, keyHint, playing, fraction, onToggle }: Props) {
  const style = { "--led": `var(--color-led-${clip.color})` } as CSSProperties;
  return (
    <button
      type="button"
      style={style}
      onClick={() => onToggle(clip)}
      className={`relative flex aspect-[1/0.92] cursor-pointer flex-col justify-between overflow-hidden rounded-[14px] border p-3.5 pb-3 text-left text-ink transition-[transform,box-shadow] duration-[60ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-led-amber motion-reduce:transition-none ${
        playing ? "pad-playing border-(--led)" : "pad-idle border-line hover:border-[#3a3d4a]"
      }`}
    >
      <span className="flex items-center justify-between">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            playing
              ? "bg-(--led) shadow-[0_0_10px_var(--led),0_0_22px_color-mix(in_srgb,var(--led)_55%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--led)_45%,#14151a)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
          }`}
        />
        <span className="font-lcd text-[15px] text-faint">{keyHint}</span>
      </span>
      <span className="font-label text-[19px] leading-[1.12] font-bold tracking-[0.05em] uppercase [overflow-wrap:anywhere]">
        {clip.name}
      </span>
      <span className="flex justify-between font-lcd text-[15px] text-muted">
        <span>
          {formatTime(clip.end - clip.start)}
          {clip.gain ? <span className="ml-2 text-faint">VOL {formatGain(clip.gain)}</span> : null}
        </span>
        <span>{playing ? "PLAY" : ""}</span>
      </span>
      <span
        className="absolute bottom-0 left-0 h-1 bg-(--led) shadow-[0_0_8px_var(--led)]"
        style={{ width: `${playing ? fraction * 100 : 0}%` }}
      />
    </button>
  );
}
