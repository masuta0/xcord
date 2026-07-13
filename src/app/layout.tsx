import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "SocialHub - Discord × X風SNS",
  description: "アカウント名だけで始められる、リアルタイムSNS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
