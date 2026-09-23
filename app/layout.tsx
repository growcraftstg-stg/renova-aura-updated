import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const body = Nunito({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "What's the surprise?",
  description: "You're not leaving until you tell me.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}
