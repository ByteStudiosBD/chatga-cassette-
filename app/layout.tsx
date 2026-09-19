import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "চট্টগ্রামের স্মৃতি",
  description: "চট্টগ্রামের চেনা জায়গা, পুরোনো গান আর চারপাশের শব্দে হারিয়ে যাওয়ার এক শান্ত অভিজ্ঞতা।",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
