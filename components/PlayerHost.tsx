import type { RefObject } from "react";

/** Offscreen host for the YouTube player. Not display:none, since the API needs it rendered. */
export default function PlayerHost({ hostRef }: { hostRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={hostRef} aria-hidden className="fixed top-0 -left-[9999px] h-[180px] w-[320px]" />;
}
