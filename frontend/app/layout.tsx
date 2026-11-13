import type { Metadata } from "next";
import { Amiri, Cormorant_Garamond, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Carries the Arabic wordmark — a Naskh revival with the same high stroke
// contrast as Cormorant, so the bilingual lockup reads as one family.
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Royal Zaad",
    template: "%s | Royal Zaad",
  },
  description: "Rare honey, single-origin coffee and considered goods from the Gulf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${inter.variable} ${cormorant.variable} ${plexMono.variable} ${amiri.variable}`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
