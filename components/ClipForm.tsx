"use client";

import type { CSSProperties, FormEvent } from "react";
import { GAIN_MAX, GAIN_MIN, LED_COLORS, formatGain, type LedColor } from "@/lib/clips";
import HwButton from "./HwButton";

export interface ClipFormValues {
  name: string;
  url: string;
  start: string;
  end: string;
  color: LedColor;
  gain: number;
}

export const EMPTY_FORM: ClipFormValues = { name: "", url: "", start: "", end: "", color: LED_COLORS[0], gain: 0 };

export interface FormMessage {
  text: string;
  kind: "ok" | "error";
}

interface Props {
  values: ClipFormValues;
  onChange: (values: ClipFormValues) => void;
  onSubmit: () => void;
  onPreview: () => void;
  onCancel: () => void;
  editingName: string | null;
  previewing: boolean;
  message: FormMessage | null;
}

const labelClass = "font-label text-[13px] font-semibold tracking-[0.16em] text-muted uppercase";
const stepBtnClass =
  "hw-btn h-9 w-9 cursor-pointer rounded-[7px] font-label text-lg leading-none font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-led-amber";
const inputClass =
  "rounded-lg border border-line bg-chassis-deep px-3 py-2.5 font-body text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-led-amber";

export default function ClipForm({ values, onChange, onSubmit, onPreview, onCancel, editingName, previewing, message }: Props) {
  const set = (patch: Partial<ClipFormValues>) => onChange({ ...values, ...patch });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <section className="panel-card mt-[26px] rounded-2xl p-5">
      <h2 className="mb-4 font-label text-base font-bold tracking-[0.22em] text-muted uppercase">
        {editingName ? `Edit — ${editingName}` : "Add clip"}
      </h2>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3.5 md:grid-cols-[1.2fr_2fr]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-name" className={labelClass}>Pad name</label>
          <input id="f-name" className={inputClass} value={values.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} required placeholder="Airhorn" autoComplete="off" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-url" className={labelClass}>YouTube URL</label>
          <input id="f-url" className={inputClass} value={values.url} onChange={(e) => set({ url: e.target.value })} required placeholder="https://www.youtube.com/watch?v=…" autoComplete="off" />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="f-start" className={labelClass}>Start time</label>
            <input id="f-start" className={inputClass} value={values.start} onChange={(e) => set({ start: e.target.value })} required placeholder="0:07 or 7" autoComplete="off" />
            <span className="text-[12.5px] text-faint">Seconds or m:ss — decimals allowed</span>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="f-end" className={labelClass}>End time</label>
            <input id="f-end" className={inputClass} value={values.end} onChange={(e) => set({ end: e.target.value })} required placeholder="0:12 or 12" autoComplete="off" />
            <span className="text-[12.5px] text-faint">Must be after the start time</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="gain-label" className={labelClass}>Volume trim</span>
          <div role="group" aria-labelledby="gain-label" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set({ gain: Math.max(GAIN_MIN, values.gain - 1) })}
              disabled={values.gain <= GAIN_MIN}
              aria-label="Quieter"
              className={`${stepBtnClass} disabled:cursor-default disabled:opacity-40`}
            >
              −
            </button>
            <span
              aria-live="polite"
              className="lcd-screen min-w-[64px] rounded-md px-3 py-1 text-center font-lcd text-2xl leading-none"
            >
              {formatGain(values.gain)}
            </span>
            <button
              type="button"
              onClick={() => set({ gain: Math.min(GAIN_MAX, values.gain + 1) })}
              disabled={values.gain >= GAIN_MAX}
              aria-label="Louder"
              className={`${stepBtnClass} disabled:cursor-default disabled:opacity-40`}
            >
              +
            </button>
            {values.gain !== 0 && (
              <button type="button" onClick={() => set({ gain: 0 })} className="cursor-pointer text-sm text-muted underline">
                Reset
              </button>
            )}
          </div>
          <span className="text-[12.5px] text-faint">
            {GAIN_MIN} to +{GAIN_MAX}, 0 is default. Changes apply live while a test plays.
          </span>
        </div>
        <fieldset className="flex min-w-0 flex-col gap-1.5">
          <legend className={`${labelClass} mb-1.5`}>Pad color</legend>
          <div className="flex flex-wrap gap-2.5">
            {LED_COLORS.map((color) => {
              const style = { background: `var(--color-led-${color})`, color: `var(--color-led-${color})` } as CSSProperties;
              return (
                <label key={color} className="relative">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    checked={values.color === color}
                    onChange={() => set({ color })}
                    className="peer absolute opacity-0 pointer-events-none"
                    aria-label={color}
                  />
                  <span
                    style={style}
                    className="block h-[26px] w-[26px] cursor-pointer rounded-full border-2 border-transparent shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] peer-checked:border-ink peer-checked:shadow-[0_0_10px_currentColor] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-led-amber"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="col-span-full flex flex-wrap items-center gap-3">
          <HwButton type="submit">{editingName ? "Save changes" : "Add to board"}</HwButton>
          <HwButton onClick={onPreview}>{previewing ? "■ Stop test" : "► Test timing"}</HwButton>
          {editingName && (
            <button type="button" onClick={onCancel} className="cursor-pointer text-muted underline">
              Cancel edit
            </button>
          )}
          <span role="status" className={`text-sm ${message?.kind === "error" ? "text-led-coral" : "text-led-lime"}`}>
            {message?.text}
          </span>
        </div>
      </form>
    </section>
  );
}
