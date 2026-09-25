import { formatTime } from "@/lib/clips";

export interface Progress {
  fraction: number;
  elapsed: number;
  total: number;
}

const METER_BLOCKS = 12;

export default function Lcd({ status, progress }: { status: string; progress?: Progress | null }) {
  const on = progress ? Math.round(progress.fraction * METER_BLOCKS) : 0;
  return (
    <div
      aria-live="polite"
      className="lcd-screen order-3 flex min-w-0 flex-1 basis-full items-center gap-3.5 overflow-hidden rounded-lg px-4 py-2 font-lcd whitespace-nowrap md:order-none md:basis-auto"
    >
      <span className="min-w-0 flex-1 overflow-hidden text-2xl text-ellipsis uppercase">{status}</span>
      {progress && (
        <>
          <span className="text-2xl tracking-[1px]">
            {"▮".repeat(on)}
            <span className="text-lcd-dim [text-shadow:none]">{"▯".repeat(METER_BLOCKS - on)}</span>
          </span>
          <span className="text-2xl">
            {formatTime(progress.elapsed)}/{formatTime(progress.total)}
          </span>
        </>
      )}
    </div>
  );
}
