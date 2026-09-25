import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "hw-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 font-label text-sm font-semibold tracking-[0.18em] uppercase text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-led-amber";

type LinkProps = { href: string; children: ReactNode; className?: string };
type ButtonProps = ComponentProps<"button"> & { href?: undefined };

/** Physical push button. Renders a link when `href` is given. */
export default function HwButton(props: LinkProps | ButtonProps) {
  if (typeof props.href === "string") {
    const { href, children, className = "" } = props;
    return (
      <Link href={href} className={`${base} ${className}`}>
        {children}
      </Link>
    );
  }
  const { className = "", type = "button", ...rest } = props;
  return <button type={type} className={`${base} ${className}`} {...rest} />;
}
