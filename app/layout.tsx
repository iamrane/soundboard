import type { Metadata } from "next";
import { Saira, Saira_Condensed, VT323 } from "next/font/google";
import "./globals.css";

const saira = Saira({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-saira" });
const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-saira-condensed",
});
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "Frontboard 01",
  description: "Shared YouTube clip soundboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${saira.variable} ${sairaCondensed.variable} ${vt323.variable}`}>
      <body className="min-h-screen bg-chassis font-body text-[15px] leading-normal text-ink antialiased">
        <main className="mx-auto max-w-[1060px] px-5 pt-7 pb-16">{children}</main>
      </body>
    </html>
  );
}
