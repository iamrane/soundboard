import type { ReactNode } from "react";

interface Props {
  subtitle: string;
  screen: ReactNode;
  controls: ReactNode;
}

export default function Faceplate({ subtitle, screen, controls }: Props) {
  return (
    <header className="panel-card flex flex-wrap items-stretch gap-4 rounded-2xl px-4 py-3.5 md:flex-nowrap">
      <div className="flex flex-col justify-center md:min-w-[148px]">
        <div className="font-label text-[22px] leading-[1.1] font-bold tracking-[0.12em] uppercase">
          Frontboard<span className="text-faint">·01</span>
        </div>
        <div className="font-label text-xs font-semibold tracking-[0.28em] text-muted uppercase">{subtitle}</div>
      </div>
      {screen}
      <div className="flex items-center gap-2.5">{controls}</div>
    </header>
  );
}
